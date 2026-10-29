const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const Orchestrator = require('../core/orchestrator');
const { spawnAsync } = require('../core/async-process');
const PRGenerator = require('../core/pr-generator');

describe('Harness Autónomo — Pruebas de Regresión de Ciclo de Vida de PR y Procesos Asíncronos', function () {
  this.timeout(20000);

  let tempDir;
  let orchestrator;

  before(function () {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-pr-test-'));
    // Inicializar repositorio git temporal
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.name "Tester"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tempDir, 'README.md'), '# Temp Repo');
    execSync('git add . && git commit -m "init"', { cwd: tempDir, stdio: 'pipe' });
    execSync('git checkout -b feat/test-req', { cwd: tempDir, stdio: 'pipe' });

    orchestrator = new Orchestrator(tempDir);
  });

  after(function () {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignorar
    }
  });

  describe('1. Confirmación Estricta de Pull Request en Orchestrator', function () {
    it('Caso 1 (Éxito): Con URL válida de PR, el trabajo transiciona a "completed"', async function () {
      const jobId = `reg-success-${Date.now()}`;
      const state = orchestrator.stateManager.createJob(jobId, 'REQ-010', {
        branchName: 'feat/req-010',
        worktreePath: tempDir
      });
      state.status = 'pr-ready';
      state.worktreePath = tempDir;
      orchestrator.stateManager.saveState(jobId, state);

      const validUrl = 'https://github.com/andreyhrndz/Lab5Paradigmas/pull/101';
      const result = await orchestrator.runJob('REQ-010', { title: 'Mensajes vacíos' }, {
        jobId,
        branchName: 'feat/req-010',
        skipPush: true,
        mockPrResult: {
          success: true,
          authenticated: true,
          method: 'gh-cli',
          prUrl: validUrl
        }
      });

      assert.strictEqual(result.status, 'completed', 'El trabajo debió transicionar a completed');
      assert.strictEqual(result.prUrl, validUrl, 'La URL del PR debe coincidir');
      assert.strictEqual(result.metadata.diagnosticArtifact, null, 'No debe haber diagnóstico de fallback cuando el PR fue confirmado');
    });

    it('Caso 2 (Fallo de Auth): Con gh no autenticado, permanece en "pr-ready" y registra diagnóstico', async function () {
      const jobId = `reg-noauth-${Date.now()}`;
      const state = orchestrator.stateManager.createJob(jobId, 'REQ-011', {
        branchName: 'feat/req-011',
        worktreePath: tempDir
      });
      state.status = 'pr-ready';
      state.worktreePath = tempDir;
      orchestrator.stateManager.saveState(jobId, state);

      const result = await orchestrator.runJob('REQ-011', { title: 'Exigir username' }, {
        jobId,
        branchName: 'feat/req-011',
        skipPush: true,
        mockPrResult: {
          success: false,
          authenticated: false,
          method: 'file-fallback',
          message: 'gh CLI no autenticada'
        }
      });

      assert.strictEqual(result.status, 'pr-ready', 'El trabajo debe conservar estado recuperable pr-ready');
      assert.notStrictEqual(result.status, 'completed', 'El trabajo JAMÁS debe pasar a completed sin PR real');
      assert.strictEqual(result.prUrl, null, 'prUrl debe ser null');
      assert(result.metadata.diagnosticArtifact, 'Debe registrar PULL_REQUEST.md como artefacto de diagnóstico');
      assert(fs.existsSync(result.metadata.diagnosticArtifact), 'El archivo de diagnóstico debe existir');
      assert(result.error && result.error.message.includes('[Pull Request Unconfirmed]'), 'Debe registrar error de PR no confirmado');
    });

    it('Caso 3 (Fallo de Push): Si falla git push a origin, conserva "pr-ready" y registra error', async function () {
      const jobId = `reg-pushfail-${Date.now()}`;
      const state = orchestrator.stateManager.createJob(jobId, 'REQ-012', {
        branchName: 'feat/req-012',
        worktreePath: tempDir
      });
      state.status = 'pr-ready';
      state.worktreePath = tempDir;
      orchestrator.stateManager.saveState(jobId, state);

      const result = await orchestrator.runJob('REQ-012', { title: 'Límite 280 caracteres' }, {
        jobId,
        branchName: 'feat/req-012',
        mockPushFailure: true
      });

      assert.strictEqual(result.status, 'pr-ready', 'El trabajo debe permanecer en pr-ready ante fallo de push');
      assert.notStrictEqual(result.status, 'completed', 'No debe marcarse como completed');
      assert.strictEqual(result.prUrl, null, 'prUrl debe ser null');
      assert(result.error && result.error.message.includes('[Git Push Error]'), 'Debe registrar el error explícito de git push');
      assert(result.metadata.diagnosticArtifact, 'Debe registrar diagnóstico local');
      assert.strictEqual(result.metadata.prDetails.method, 'push-failed');
    });

    it('Caso 4 (PR Preexistente): Si ya existe un PR con URL válida, transiciona a "completed"', async function () {
      const jobId = `reg-existing-${Date.now()}`;
      const state = orchestrator.stateManager.createJob(jobId, 'REQ-010', {
        branchName: 'feat/req-010-exist',
        worktreePath: tempDir
      });
      state.status = 'pr-ready';
      state.worktreePath = tempDir;
      orchestrator.stateManager.saveState(jobId, state);

      const existingUrl = 'https://github.com/andreyhrndz/Lab5Paradigmas/pull/88';
      const result = await orchestrator.runJob('REQ-010', { title: 'Mensajes vacíos existente' }, {
        jobId,
        branchName: 'feat/req-010-exist',
        skipPush: true,
        mockPrResult: {
          success: true,
          authenticated: true,
          method: 'existing',
          prUrl: existingUrl
        }
      });

      assert.strictEqual(result.status, 'completed', 'Debe completarse con el PR existente');
      assert.strictEqual(result.prUrl, existingUrl, 'Debe adoptar la URL del PR existente');
      assert.strictEqual(result.metadata.diagnosticArtifact, null);
    });

    it('Caso 5 (Fallo de CLI gh pr create): Si gh retorna error, conserva "pr-ready" y registra error', async function () {
      const jobId = `reg-clifail-${Date.now()}`;
      const state = orchestrator.stateManager.createJob(jobId, 'REQ-011', {
        branchName: 'feat/req-011-fail',
        worktreePath: tempDir
      });
      state.status = 'pr-ready';
      state.worktreePath = tempDir;
      orchestrator.stateManager.saveState(jobId, state);

      const result = await orchestrator.runJob('REQ-011', { title: 'Fallo en CLI' }, {
        jobId,
        branchName: 'feat/req-011-fail',
        skipPush: true,
        mockPrResult: {
          success: false,
          authenticated: true,
          method: 'gh-cli',
          error: 'graphql: Head branch not found on remote',
          message: 'gh pr create falló: Head branch not found on remote'
        }
      });

      assert.strictEqual(result.status, 'pr-ready', 'Debe mantenerse en pr-ready para reintento');
      assert.notStrictEqual(result.status, 'completed');
      assert.strictEqual(result.prUrl, null);
      assert(result.error && result.error.message.includes('Head branch not found on remote'));
      assert(result.metadata.diagnosticArtifact, 'Debe haber guardado PULL_REQUEST.md para diagnóstico');
    });
  });

  describe('2. Pruebas de Robustez de spawnAsync (Procesos Asíncronos)', function () {
    it('Debe capturar salida estándar correctamente en ejecuciones exitosas', async function () {
      const res = await spawnAsync('node', ['-e', 'console.log("TEST_OK_123")']);
      assert.strictEqual(res.status, 0);
      assert.strictEqual(res.timedOut, false);
      assert(res.stdout.includes('TEST_OK_123'));
    });

    it('Debe capturar código de salida no cero y errores en stderr', async function () {
      const res = await spawnAsync('node', ['-e', 'console.error("ERROR_MSG_XYZ"); process.exit(42);']);
      assert.strictEqual(res.status, 42);
      assert.strictEqual(res.timedOut, false);
      assert(res.stderr.includes('ERROR_MSG_XYZ'));
    });

    it('Debe gestionar timeout terminando el proceso sin promesas pendientes ni bloqueos', async function () {
      const startTime = Date.now();
      const res = await spawnAsync('node', ['-e', 'setInterval(() => {}, 1000)'], {
        timeout: 300
      });
      const duration = Date.now() - startTime;

      assert.strictEqual(res.timedOut, true, 'Debe marcar timedOut como true');
      assert.strictEqual(res.status, 1, 'Status de timeout debe ser 1');
      assert(res.stderr.includes('timed out after 300ms'), 'Debe incluir mensaje de timeout');
      assert(duration >= 250 && duration < 2500, `Duración esperada ~300ms, fue: ${duration}ms`);
    });

    it('Debe manejar fallos de comando inexistente de forma segura sin excepciones no capturadas', async function () {
      const res = await spawnAsync('ejecutable_que_no_existe_xyz_12345');
      assert.strictEqual(res.status, 1);
      assert.strictEqual(res.timedOut, false);
      assert(res.error || res.stderr);
    });
  });
});
