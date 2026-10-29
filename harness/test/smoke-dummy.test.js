const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const Orchestrator = require('../core/orchestrator');

describe('Harness Autónomo — Smoke Test End-to-End con Requerimiento Dummy (REQ-999)', function () {
  this.timeout(120000); // 2 minutos para el ciclo completo de agentes y gates

  const repoRoot = path.resolve(__dirname, '..', '..');
  let orchestrator;
  const jobId = `smoke-999-${Date.now()}`;
  const branchName = 'feat/smoke-test-999';
  let finalState = null;

  before(function () {
    orchestrator = new Orchestrator(repoRoot);
  });

  after(function () {
    // Limpieza estricta: remover el worktree de prueba y la rama temporal
    if (finalState && finalState.worktreePath) {
      try {
        orchestrator.cleanJob(jobId);
      } catch (e) {
        // Ignorar
      }
    }
    try {
      execSync(`git branch -D ${branchName}`, { cwd: repoRoot, stdio: 'pipe' });
    } catch (e) {
      // Ignorar si la rama no fue creada
    }
    // Limpiar job dir de prueba
    const jobDir = path.join(repoRoot, '.harness', 'jobs', jobId);
    if (fs.existsSync(jobDir)) {
      fs.rmSync(jobDir, { recursive: true, force: true });
    }
  });

  it('Debe ejecutar el ciclo de 6 fases del harness con FoFo gates y separación Judge/Author', async function () {
    const dummySpec = {
      reqId: 'REQ-999',
      title: 'Diagnóstico de ping en biblioteca unalib',
      summary: 'Proveer método unalib.ping() que retorne "pong"',
      description: 'El módulo unalib debe exponer una función ping que responda con la cadena literal "pong".',
      acceptance: 'unalib.ping() debe retornar exactamente "pong"',
      targetFunction: 'ping',
      targetFile: 'despues/libs/unalib.js',
      scenarios: [
        {
          name: 'Invocación de ping()',
          given: 'El módulo unalib cargado',
          when: 'Se invoca unalib.ping()',
          then: 'Debe devolver "pong"'
        }
      ],
      testTemplate: `// @req: REQ-999
const assert = require('assert');
const unalib = require('../../libs/unalib');

describe('REQ-999 — Diagnóstico de ping en biblioteca unalib', function () {
  it('unalib.ping() debe devolver exactamente "pong"', function () {
    assert.strictEqual(typeof unalib.ping, 'function', 'unalib.ping debe ser una función');
    assert.strictEqual(unalib.ping(), 'pong', 'unalib.ping() debe retornar "pong"');
  });
});
`,
      implementationPatch: {
        file: 'despues/libs/unalib.js',
        apply: (content) => {
          if (!content.includes('ping: function')) {
            return content.replace(
              'module.exports = {',
              'module.exports = {\n  ping: function () {\n    return "pong";\n  },'
            );
          }
          return content;
        }
      }
    };

    // Ejecutar el trabajo completo aislando la publicación remota para no crear PR ficticio
    finalState = await orchestrator.runJob('REQ-999', dummySpec, {
      jobId,
      branchName,
      baseBranch: 'feat/autonomous-harness',
      skipPush: true,
      mockPrResult: {
        success: true,
        authenticated: true,
        method: 'gh-cli',
        prUrl: 'https://github.com/andreyhrndz/Lab5Paradigmas/pull/999'
      }
    });

    assert(finalState, 'El estado final del trabajo debe existir');
    assert.strictEqual(finalState.reqId, 'REQ-999');
    assert.strictEqual(finalState.status, 'completed', `El trabajo debió completarse exitosamente. Error: ${finalState.error?.message}`);

    // 1. Verificar veredictos de FoFo
    const gateNames = finalState.fofoVerdicts.map(v => v.gate);
    assert(gateNames.includes('spec-lint'), 'spec-lint debió ejecutarse');
    assert(gateNames.includes('trace-gate-phase1'), 'trace-gate debió ejecutarse');
    assert(gateNames.includes('redgreen-gate-red'), 'redgreen-gate debió verificar estado RED');
    assert(gateNames.includes('test-lock-write'), 'test-lock debió congelar pruebas');
    assert(gateNames.includes('test-lock-author-check'), 'test-lock debió verificar no-manipulación');
    assert(gateNames.includes('secret-scan'), 'secret-scan debió ejecutarse');

    // Todos los gates deben ser 'pass'
    for (const v of finalState.fofoVerdicts) {
      assert.strictEqual(v.status, 'pass', `El gate ${v.gate} debió pasar: ${v.summary}`);
    }

    // 2. Verificar que se generó PULL_REQUEST.md en el directorio del trabajo
    const prFilePath = path.join(repoRoot, '.harness', 'jobs', jobId, 'PULL_REQUEST.md');
    assert(fs.existsSync(prFilePath), 'PULL_REQUEST.md debió ser generado');
    const prContent = fs.readFileSync(prFilePath, 'utf-8');
    assert(prContent.includes('REQ-999'), 'PULL_REQUEST.md debe mencionar el reqId');
    assert(prContent.includes('test-lock'), 'PULL_REQUEST.md debe incluir evidencia de test-lock');

    // 3. Verificar que los metadatos de PR existen y contienen URL válida
    const prDetails = finalState.metadata.prDetails;
    assert(prDetails, 'Los metadatos de PR deben existir');
    assert.strictEqual(finalState.prUrl, 'https://github.com/andreyhrndz/Lab5Paradigmas/pull/999');
    assert.strictEqual(finalState.metadata.diagnosticArtifact, null);
  });
});
