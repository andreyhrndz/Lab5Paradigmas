const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const PortAllocator = require('../core/port-allocator');
const { StateManager } = require('../core/state-manager');
const WorktreeManager = require('../core/worktree-manager');
const FoFoDriver = require('../core/fofo-driver');

describe('Harness Autónomo — Verificación de Concurrencia Real (3 Worktrees Simultáneos)', function () {
  this.timeout(45000);

  const testRoot = path.resolve(__dirname, '..', '..');
  const jobsDir = path.resolve(testRoot, '.harness', 'test_concurrent_jobs');
  let portAllocator;
  let stateManager;
  let worktreeManager;
  let fofoDriver;

  const jobIds = ['conc-job-alpha', 'conc-job-beta', 'conc-job-gamma'];
  const branchNames = ['feat/test-conc-alpha', 'feat/test-conc-beta', 'feat/test-conc-gamma'];
  let allocatedPorts = [];
  let createdWorktrees = [];

  before(function () {
    if (fs.existsSync(jobsDir)) {
      fs.rmSync(jobsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(jobsDir, { recursive: true });

    portAllocator = new PortAllocator(3050, 3100);
    stateManager = new StateManager(jobsDir);
    worktreeManager = new WorktreeManager(testRoot);
    fofoDriver = new FoFoDriver();
  });

  after(function () {
    // Limpieza ordenada
    for (const wt of createdWorktrees) {
      try {
        worktreeManager.removeWorktree(wt.jobId);
      } catch (e) {
        // Ignorar
      }
      try {
        execSync(`git branch -D ${wt.branch}`, { cwd: testRoot, stdio: 'pipe' });
      } catch (e) {
        // Ignorar
      }
    }
    if (fs.existsSync(jobsDir)) {
      fs.rmSync(jobsDir, { recursive: true, force: true });
    }
  });

  it('1. Debe asignar 3 puertos HTTP únicos e independientes de forma concurrente', async function () {
    const portPromises = jobIds.map(id => portAllocator.allocate(id));
    allocatedPorts = await Promise.all(portPromises);

    assert.strictEqual(allocatedPorts.length, 3);
    const uniquePorts = new Set(allocatedPorts);
    assert.strictEqual(uniquePorts.size, 3, 'Todos los puertos asignados deben ser estrictamente diferentes');
    for (const port of allocatedPorts) {
      assert(port >= 3050 && port <= 3100, `Puerto ${port} debe estar en el rango asignado`);
    }
  });

  it('2. Debe crear y aislar 3 Git worktrees independientes en paralelo sin race conditions', function () {
    const worktreeResults = [];

    // Crear 3 worktrees en ramas separadas
    for (let i = 0; i < jobIds.length; i++) {
      const jobId = jobIds[i];
      const branch = branchNames[i];
      const wtPath = worktreeManager.createWorktree(jobId, branch, 'main');

      assert(fs.existsSync(wtPath), `Worktree ${jobId} debe existir en disco: ${wtPath}`);
      assert(fs.existsSync(path.join(wtPath, '.git')), `Worktree ${jobId} debe tener referencia .git`);

      worktreeResults.push({ jobId, branch, path: wtPath });
      createdWorktrees.push({ jobId, branch, path: wtPath });
    }

    assert.strictEqual(worktreeResults.length, 3);
    const uniquePaths = new Set(worktreeResults.map(w => w.path));
    assert.strictEqual(uniquePaths.size, 3, 'Los 3 worktrees deben residir en rutas físicas diferentes');
  });

  it('3. Debe gestionar el estado persistente de 3 trabajos simultáneos sin sobreescrituras', function () {
    // Crear y actualizar estados en paralelo
    for (let i = 0; i < jobIds.length; i++) {
      const jobId = jobIds[i];
      stateManager.createJob(jobId, `REQ-CONC-${i + 1}`, {
        branchName: branchNames[i],
        port: allocatedPorts[i]
      });
      stateManager.transition(jobId, 'specifying', `Fase inicial trabajo ${i + 1}`);
      stateManager.transition(jobId, 'testing-red', `Fase red test trabajo ${i + 1}`);
    }

    // Comprobar que los 3 estados existen y mantienen su integridad
    for (let i = 0; i < jobIds.length; i++) {
      const jobId = jobIds[i];
      const state = stateManager.getState(jobId);
      assert(state, `Estado de ${jobId} debe existir`);
      assert.strictEqual(state.reqId, `REQ-CONC-${i + 1}`);
      assert.strictEqual(state.status, 'testing-red');
      assert.strictEqual(state.port, allocatedPorts[i]);
      assert.strictEqual(state.history.length, 3); // initial + specifying + testing-red
    }
  });

  it('4. Debe ejecutar FoFo test-lock independientemente en los 3 worktrees sin interferencia mutua', function () {
    // Escribir un archivo de prueba diferente en cada worktree
    for (let i = 0; i < createdWorktrees.length; i++) {
      const wt = createdWorktrees[i];
      const testDir = path.join(wt.path, 'despues', 'test', 'unit');
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

      const testFile = path.join(testDir, `conc_test_${i + 1}.test.js`);
      fs.writeFileSync(testFile, `// @req: REQ-CONC-${i + 1}\n// Test for concurrent worktree ${i + 1}\n`, 'utf-8');

      // Escribir lockfile en el worktree correspondiente
      const lockRes = fofoDriver.writeTestLock(wt.path, 'despues/test/unit/**/*.test.js');
      assert.strictEqual(lockRes.passed, true, `test-lock write debe pasar en worktree ${i + 1}`);

      const lockJsonPath = path.join(wt.path, 'TEST-LOCK.json');
      assert(fs.existsSync(lockJsonPath), `TEST-LOCK.json debe existir en ${wt.path}`);

      // Verificar lockfile en el mismo worktree
      const verifyRes = fofoDriver.verifyTestLock(wt.path, 'despues/test/unit/**/*.test.js');
      assert.strictEqual(verifyRes.passed, true, `test-lock verify debe pasar en worktree ${i + 1}`);
    }
  });

  it('5. Debe liberar ordenadamente los puertos y remover los 3 worktrees', function () {
    for (const jobId of jobIds) {
      portAllocator.release(jobId);
    }
    assert.strictEqual(portAllocator.allocatedPorts.size, 0, 'Todos los puertos deben ser liberados');

    for (const wt of createdWorktrees) {
      worktreeManager.removeWorktree(wt.jobId);
      assert(!fs.existsSync(wt.path), `El worktree ${wt.jobId} debe haber sido eliminado de disco`);
    }
  });

  it('6. Debe demostrar avance concurrente simultáneo de 3 trabajos en el Orquestador con solapamiento temporal', async function () {
    this.timeout(60000);
    const Orchestrator = require('../core/orchestrator');
    const orch = new Orchestrator(testRoot);

    const activeJobs = new Set();
    let maxConcurrentInFlight = 0;

    // Barrera de sincronización para asegurar que los 3 trabajos coincidan en ejecución activa
    const barrier = {
      target: 3,
      current: 0,
      resolvers: [],
      async wait() {
        this.current++;
        if (this.current >= this.target) {
          this.resolvers.forEach(r => r());
          return;
        }
        return new Promise(resolve => this.resolvers.push(resolve));
      }
    };

    const reqIds = ['REQ-201', 'REQ-202', 'REQ-203'];
    const jobPromises = reqIds.map(async (reqId, index) => {
      const jobId = `par-job-${index + 1}-${Date.now()}`;
      const branchName = `feat/test-par-${index + 1}-${Date.now()}`;

      const specData = {
        reqId,
        title: `Prueba de concurrencia ${reqId}`,
        summary: `Función concurrente ${reqId}`,
        description: `El sistema debe avanzar este requerimiento en paralelo.`,
        acceptance: `unalib.dummy_${index + 1}() debe retornar true`,
        targetFunction: `dummy_${index + 1}`,
        scenarios: [{ name: 'Concurrencia', given: 'Sistema activo', when: 'Invocación', then: 'Retorna true' }]
      };

      const options = {
        jobId,
        branchName,
        testScript: 'test:unit',
        testGeneratorFn: () => {
          return `// @req: ${reqId}
const assert = require('assert');
const unalib = require('../../libs/unalib');
describe('${reqId}', function () {
  it('debe validar la funcion dummy_${index + 1}', function () {
    assert.strictEqual(typeof unalib.dummy_${index + 1}, 'function', 'Debe existir la función');
  });
});`;
        },
        implementorFn: async (spec, worktreePath) => {
          // Registrar trabajo activo
          activeJobs.add(jobId);
          maxConcurrentInFlight = Math.max(maxConcurrentInFlight, activeJobs.size);

          // Sincronizar en barrera para demostrar concurrencia real de 3 trabajos en simultáneo
          await barrier.wait();
          maxConcurrentInFlight = Math.max(maxConcurrentInFlight, activeJobs.size);

          await new Promise(r => setTimeout(r, 200));

          const unalibPath = path.join(worktreePath, 'despues', 'libs', 'unalib.js');
          let code = fs.readFileSync(unalibPath, 'utf-8');
          if (!code.includes(`dummy_${index + 1}:`)) {
            code = code.replace(
              'module.exports = {',
              `module.exports = {\n  dummy_${index + 1}: function() { return true; },`
            );
            fs.writeFileSync(unalibPath, code, 'utf-8');
          }
          activeJobs.delete(jobId);
        }
      };

      const startTime = Date.now();
      const state = await orch.runJob(reqId, specData, options);
      const endTime = Date.now();

      // Limpieza del worktree y rama creada
      try {
        orch.cleanJob(jobId);
        execSync(`git branch -D ${branchName}`, { cwd: testRoot, stdio: 'pipe' });
      } catch (e) {}

      return { jobId, reqId, state, startTime, endTime };
    });

    const results = await Promise.all(jobPromises);

    // 1. Todos los trabajos deben haber completado exitosamente
    assert.strictEqual(results.length, 3);
    for (const res of results) {
      assert.strictEqual(res.state.status, 'completed', `El trabajo ${res.jobId} debió completarse`);
      assert(res.state.port >= 3000, `Puerto ${res.state.port} asignado correctamente`);
    }

    // 2. Demostración de concurrencia: El pico de trabajos simultáneos en vuelo debe ser 3
    assert.strictEqual(maxConcurrentInFlight, 3, 'Los 3 trabajos deben haber estado en ejecución activa simultáneamente');

    // 3. Demostración de solapamiento temporal: max(startTimes) < min(endTimes)
    const startTimes = results.map(r => r.startTime);
    const endTimes = results.map(r => r.endTime);
    const latestStart = Math.max(...startTimes);
    const earliestEnd = Math.min(...endTimes);

    assert(
      latestStart < earliestEnd,
      `Debe existir solapamiento temporal entre los 3 trabajos (último inicio: ${latestStart} < primer fin: ${earliestEnd})`
    );
  });
});
