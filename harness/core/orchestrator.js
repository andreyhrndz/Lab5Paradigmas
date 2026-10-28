const path = require('path');
const fs = require('fs');
const { execSync, spawnSync } = require('child_process');
const { spawnAsync } = require('./async-process');

const PortAllocator = require('./port-allocator');
const { StateManager } = require('./state-manager');
const WorktreeManager = require('./worktree-manager');
const OpenSpecDriver = require('./openspec-driver');
const FoFoDriver = require('./fofo-driver');
const PRGenerator = require('./pr-generator');
const AgentAdapter = require('../agents/agent-adapter');
const RedValidator = require('./red-validator');

class Orchestrator {
  constructor(repoRoot = null, options = {}) {
    this.repoRoot = repoRoot || process.cwd();
    this.portAllocator = new PortAllocator();
    this.stateManager = new StateManager(path.resolve(this.repoRoot, '.harness', 'jobs'));
    this.worktreeManager = new WorktreeManager(this.repoRoot);
    this.openspecDriver = new OpenSpecDriver(this.repoRoot);
    this.fofoDriver = new FoFoDriver();
    this.prGenerator = new PRGenerator(this.repoRoot);
    this.agentAdapter = new AgentAdapter(options);
    this.redValidator = new RedValidator(this.repoRoot);
  }

  async runJob(reqId, specData = {}, options = {}) {
    const jobId = options.jobId || `${reqId.toLowerCase()}-${Date.now()}`;
    const branchName = options.branchName || `feat/${reqId.toLowerCase()}`;
    const baseBranch = options.baseBranch || 'main';

    let state = this.stateManager.getState(jobId);
    if (!state) {
      state = this.stateManager.createJob(jobId, reqId, {
        branchName,
        maxRetries: options.maxRetries || 3,
        specData
      });
    }

    try {
      // 1. Asignar puerto aislado
      const port = await this.portAllocator.allocate(jobId);
      state.port = port;
      this.stateManager.saveState(jobId, state);

      // 2. Crear worktree exclusivo
      let worktreePath = state.worktreePath;
      if (!worktreePath || !fs.existsSync(worktreePath)) {
        worktreePath = this.worktreeManager.createWorktree(jobId, branchName, baseBranch);
        state.worktreePath = worktreePath;
        this.stateManager.saveState(jobId, state);
      }

      // -------------------------------------------------------------
      // FASE 0: Especificación y Diseño con OpenSpec
      // -------------------------------------------------------------
      if (['pending', 'specifying'].includes(state.status)) {
        state = this.stateManager.transition(jobId, 'specifying', 'Generando propuesta y especificaciones con OpenSpec', {
          fofoVerdicts: state.fofoVerdicts
        });

        // Manejo de ambigüedad de negocio
        if (specData.isAmbiguous) {
          state.isBlocked = true;
          state.blockReason = specData.ambiguityReason || 'Criterio pendiente de aclaración con el usuario';
          state = this.stateManager.transition(jobId, 'blocked', `Bloqueo por duda de negocio: ${state.blockReason}`, {
            isBlocked: true,
            blockReason: state.blockReason
          });

          // Generar PR borrador si hay cambios revisables
          this.prGenerator.createPullRequest(state, specData, true);
          return state;
        }

        // Crear artefactos OpenSpec (proposal, specs, design, tasks)
        this.openspecDriver.createChangeStructure(reqId.toLowerCase(), specData, worktreePath);

        // Validar especificación mediante FoFo spec-lint
        const specLintRes = this.fofoDriver.runSpecLint(worktreePath, 'SPEC.md');
        state.fofoVerdicts.push({
          gate: 'spec-lint',
          status: specLintRes.passed ? 'pass' : 'fail',
          summary: specLintRes.verdict?.summary || (specLintRes.passed ? 'SPEC cumple formato' : 'Fallo en SPEC.md')
        });

        if (!specLintRes.passed) {
          throw new Error(`[FoFo Gate Error] spec-lint falló en worktree: ${specLintRes.stderr || specLintRes.stdout}`);
        }
      }

      // -------------------------------------------------------------
      // FASE 1 y 2: Judge Agent — Intenciones de prueba y Pruebas en Rojo
      // -------------------------------------------------------------
      let redErrorOutput = '';
      if (['specifying', 'testing-red'].includes(state.status)) {
        state = this.stateManager.transition(jobId, 'testing-red', 'Judge derivando intenciones y escribiendo pruebas rojas', {
          fofoVerdicts: state.fofoVerdicts
        });

        const judge = this.agentAdapter.getJudge();

        // Derivar TEST-REQS.yaml (Phase 1)
        await judge.deriveTestRequirements(specData, worktreePath);

        // Validar trazabilidad inicial
        const traceRes = this.fofoDriver.runTraceGate(worktreePath);
        state.fofoVerdicts.push({
          gate: 'trace-gate-phase1',
          status: traceRes.passed ? 'pass' : 'fail',
          summary: traceRes.verdict?.summary || 'Trazabilidad inicial verificada'
        });

        // Generar pruebas rojas (Phase 2)
        const redTestResult = await judge.generateRedTests(specData, worktreePath, options.testGeneratorFn);
        const targetTestFile = redTestResult?.testFilePath || path.resolve(worktreePath, 'despues', 'test', 'unit', `${reqId.toLowerCase()}.test.js`);

        // Endurecimiento TDD RED: Validación rigurosa de fallos de aserción vs sintaxis/dependencias/timeout
        const redVerdict = await this.redValidator.validateRedTest(targetTestFile, worktreePath, {
          port: state.port
        });

        redErrorOutput = redVerdict.rawOutput;

        state.fofoVerdicts.push({
          gate: 'redgreen-gate-red',
          status: redVerdict.isRed ? 'pass' : 'fail',
          category: redVerdict.category,
          summary: redVerdict.summary
        });

        if (!redVerdict.isRed) {
          throw new Error(`[TDD RED Error] Validación en rojo rechazada (${redVerdict.category}): ${redVerdict.summary}`);
        }

        // Congelar y bloquear las pruebas con FoFo test-lock
        const lockRes = this.fofoDriver.writeTestLock(worktreePath);
        state.fofoVerdicts.push({
          gate: 'test-lock-write',
          status: lockRes.passed ? 'pass' : 'fail',
          summary: 'Pruebas congeladas en TEST-LOCK.json'
        });

        if (!lockRes.passed) {
          throw new Error(`[FoFo Gate Error] Fallo al escribir TEST-LOCK.json: ${lockRes.stderr || lockRes.stdout}`);
        }

        state = this.stateManager.transition(jobId, 'tests-locked', 'Pruebas congeladas y protegidas contra manipulación', {
          fofoVerdicts: state.fofoVerdicts
        });
      }

      // -------------------------------------------------------------
      // FASE 3: Author Agent — Implementación a Verde
      // -------------------------------------------------------------
      if (['tests-locked', 'implementing'].includes(state.status)) {
        state = this.stateManager.transition(jobId, 'implementing', 'Author implementando cambios en código productivo', {
          fofoVerdicts: state.fofoVerdicts
        });

        const author = this.agentAdapter.getAuthor();
        await author.implement(specData, worktreePath, options.implementorFn, redErrorOutput);

        // COMPROBACIÓN CRÍTICA DE FOFO: Verificar que el Author NO modificó las pruebas bloqueadas
        const lockVerify = this.fofoDriver.verifyTestLock(worktreePath);
        state.fofoVerdicts.push({
          gate: 'test-lock-author-check',
          status: lockVerify.passed ? 'pass' : 'fail',
          summary: lockVerify.passed ? 'Integridad de pruebas confirmada (sin manipulación)' : 'Violación de integridad: pruebas modificadas por Author'
        });

        if (!lockVerify.passed) {
          throw new Error(`[FoFo Security Violation] El Author modificó pruebas bloqueadas. Abortando trabajo.`);
        }
      }

      // -------------------------------------------------------------
      // FASE 4: Referee — Verificación Completa y Gates
      // -------------------------------------------------------------
      if (['implementing', 'verifying'].includes(state.status)) {
        state = this.stateManager.transition(jobId, 'verifying', 'Referee ejecutando gates de seguridad y suites completas', {
          fofoVerdicts: state.fofoVerdicts
        });

        // 1. Escaneo de secretos
        const secretRes = this.fofoDriver.runSecretScan(worktreePath);
        state.fofoVerdicts.push({
          gate: 'secret-scan',
          status: secretRes.passed ? 'pass' : 'fail',
          summary: secretRes.passed ? 'Sin secretos detectados' : 'Secretos detectados en código'
        });
        if (!secretRes.passed) {
          throw new Error(`[FoFo Security Gate] Secretos detectados en el trabajo.`);
        }

        // 2. Ejecutar suites de pruebas en el worktree de forma asíncrona no bloqueante
        const mainNm = path.resolve(this.repoRoot, 'despues', 'node_modules');
        const wtNm = path.resolve(worktreePath, 'despues', 'node_modules');
        const nodePathEnv = [wtNm, mainNm, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);

        const testScript = options.testScript || 'test:all';
        const testRes = await spawnAsync('npm', ['run', testScript], {
          cwd: path.resolve(worktreePath, 'despues'),
          encoding: 'utf-8',
          shell: true,
          env: { ...process.env, PORT: String(state.port), NODE_PATH: nodePathEnv }
        });

        if (testRes.status !== 0) {
          throw new Error(`[Test Suites Error] Fallos en las pruebas combinadas:\n${testRes.stderr || testRes.stdout}`);
        }

        // 3. Registrar procedencia
        this.agentAdapter.recordProvenance(
          worktreePath,
          [`despues/test/unit/${reqId.toLowerCase()}.test.js`],
          ['despues/libs/unalib.js'],
          jobId
        );
      }

      // -------------------------------------------------------------
      // FASE 5: Generación de Pull Request
      // -------------------------------------------------------------
      if (['verifying', 'pr-ready'].includes(state.status)) {
        state = this.stateManager.transition(jobId, 'pr-ready', 'Preparando y creando Pull Request', {
          fofoVerdicts: state.fofoVerdicts
        });

        // Hacer commit de los cambios en la rama del worktree
        try {
          execSync('git add -A', { cwd: worktreePath, stdio: 'pipe' });
          execSync(`git commit -m "feat(${reqId.toLowerCase()}): implementacion autonoma validada con FoFo"`, {
            cwd: worktreePath,
            stdio: 'pipe'
          });
        } catch (commitErr) {
          // Si no hay cambios para commit, continuar
        }

        // Crear o registrar Pull Request
        const prResult = this.prGenerator.createPullRequest(state, specData);
        state.prUrl = prResult.prUrl || null;
        state.metadata.prDetails = prResult;

        // Un trabajo bloqueado o fallido jamás debe marcarse como completed por haber generado PULL_REQUEST.md
        if (state.isBlocked || state.status === 'blocked' || state.status === 'failed') {
          return state;
        }

        state = this.stateManager.transition(jobId, 'completed', 'Trabajo completado exitosamente y PR listo', {
          prUrl: state.prUrl,
          fofoVerdicts: state.fofoVerdicts,
          metadata: state.metadata
        });
      }

      return state;
    } catch (err) {
      console.error(`[Orchestrator] Error en trabajo ${jobId}: ${err.message}`);
      const updatedState = this.stateManager.recordError(jobId, err, state.status);
      return updatedState;
    } finally {
      // Liberar puerto
      this.portAllocator.release(jobId);
    }
  }

  async runBatch(reqList, options = {}) {
    const promises = reqList.map((req) => {
      const spec = typeof req === 'string' ? { reqId: req } : req;
      return this.runJob(spec.reqId, spec, options);
    });

    return await Promise.all(promises);
  }

  cleanJob(jobId) {
    this.portAllocator.release(jobId);
    this.worktreeManager.removeWorktree(jobId);
  }
}

module.exports = Orchestrator;
