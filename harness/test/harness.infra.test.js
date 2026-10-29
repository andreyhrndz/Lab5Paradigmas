const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const PortAllocator = require('../core/port-allocator');
const { StateManager, VALID_STATES } = require('../core/state-manager');
const WorktreeManager = require('../core/worktree-manager');
const FoFoDriver = require('../core/fofo-driver');
const OpenSpecDriver = require('../core/openspec-driver');
const IntegrationVerifier = require('../core/integration-verifier');
const PRGenerator = require('../core/pr-generator');

describe('Harness Autónomo — Pruebas de Infraestructura y Resiliencia', function () {
  this.timeout(25000);

  let tempDir;
  let testRepoRoot;

  before(function () {
    // Crear un repositorio temporal completamente aislado para las pruebas de infraestructura
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-infra-test-'));
    testRepoRoot = path.join(tempDir, 'repo');
    fs.mkdirSync(testRepoRoot, { recursive: true });

    // Inicializar repositorio Git en el directorio temporal
    execSync('git init -b main', { cwd: testRepoRoot, stdio: 'pipe' });
    execSync('git config user.name "Harness Test"', { cwd: testRepoRoot, stdio: 'pipe' });
    execSync('git config user.email "harness-test@example.com"', { cwd: testRepoRoot, stdio: 'pipe' });

    // Commit base inicial
    fs.writeFileSync(path.join(testRepoRoot, 'README.md'), '# Repo de Prueba', 'utf-8');
    execSync('git add README.md', { cwd: testRepoRoot, stdio: 'pipe' });
    execSync('git commit -m "initial commit"', { cwd: testRepoRoot, stdio: 'pipe' });
  });

  after(function () {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignorar bloqueos temporales de Windows en cleanup de tempdir
    }
  });

  describe('1. Asignación y aislamiento de puertos (PortAllocator)', function () {
    it('debe asignar puertos distintos a trabajos concurrentes', async function () {
      const allocator = new PortAllocator(3500, 3600);
      const portA = await allocator.allocate('job-A');
      const portB = await allocator.allocate('job-B');
      const portC = await allocator.allocate('job-C');

      assert.notStrictEqual(portA, portB);
      assert.notStrictEqual(portB, portC);
      assert.ok(portA >= 3500 && portA <= 3600);
      assert.ok(portB >= 3500 && portB <= 3600);

      // Reutiliza el mismo puerto si el trabajo vuelve a consultar
      const portARepeat = await allocator.allocate('job-A');
      assert.strictEqual(portA, portARepeat);

      // Liberar puerto
      const released = allocator.release('job-A');
      assert.strictEqual(released, portA);
      assert.strictEqual(allocator.getPort('job-A'), null);
    });
  });

  describe('2. Máquina de estados persistente y recuperación (StateManager)', function () {
    let stateManager;
    const testStateDir = path.join(os.tmpdir(), 'harness-state-test-' + Date.now());

    before(function () {
      stateManager = new StateManager(testStateDir);
    });

    after(function () {
      try {
        fs.rmSync(testStateDir, { recursive: true, force: true });
      } catch (e) {}
    });

    it('debe registrar un trabajo en estado pending y persistir a disco', function () {
      const state = stateManager.createJob('job-001', 'REQ-TEST', { port: 3050 });
      assert.strictEqual(state.status, 'pending');
      assert.strictEqual(state.reqId, 'REQ-TEST');
      assert.strictEqual(state.port, 3050);

      // Leer de disco y verificar que coincida
      const loaded = stateManager.getState('job-001');
      assert.strictEqual(loaded.jobId, 'job-001');
      assert.strictEqual(loaded.status, 'pending');
    });

    it('debe permitir transiciones de estado válidas y registrar historial', function () {
      stateManager.transition('job-001', 'specifying', 'OpenSpec iniciado');
      stateManager.transition('job-001', 'testing-red', 'Judge generó pruebas en rojo');
      stateManager.transition('job-001', 'tests-locked', 'Pruebas congeladas en TEST-LOCK.json');
      stateManager.transition('job-001', 'implementing', 'Author desarrollando');
      stateManager.transition('job-001', 'verifying', 'Gates de FoFo');
      stateManager.transition('job-001', 'pr-ready', 'PR preparado');
      const finalState = stateManager.transition('job-001', 'completed', 'Trabajo finalizado');

      assert.strictEqual(finalState.status, 'completed');
      assert.ok(finalState.history.length >= 7);
    });

    it('debe rechazar transiciones a estados inválidos', function () {
      assert.throws(() => {
        stateManager.transition('job-001', 'estado_inexistente');
      }, /Estado inválido/);
    });

    it('debe registrar errores y cambiar a failed al superar maxRetries', function () {
      const state = stateManager.createJob('job-retry-test', 'REQ-RETRY', { maxRetries: 2 });
      assert.strictEqual(state.retryCount, 0);

      stateManager.recordError('job-retry-test', new Error('Fallo transitorio 1'));
      let updated = stateManager.getState('job-retry-test');
      assert.strictEqual(updated.retryCount, 1);
      assert.notStrictEqual(updated.status, 'failed');

      stateManager.recordError('job-retry-test', new Error('Fallo crítico 2'));
      updated = stateManager.getState('job-retry-test');
      assert.strictEqual(updated.retryCount, 2);
      assert.strictEqual(updated.status, 'failed');
    });
  });

  describe('3. Creación y aislamiento de Git Worktrees (WorktreeManager)', function () {
    let worktreeManager;

    before(function () {
      worktreeManager = new WorktreeManager(testRepoRoot);
    });

    it('debe crear un worktree aislado en una rama independiente', function () {
      const wtPath = worktreeManager.createWorktree('job-wt-1', 'feat/wt-test-1', 'main');
      assert.ok(fs.existsSync(wtPath));

      // Comprobar que git reconoce el worktree
      const list = worktreeManager.listWorktrees();
      assert.ok(list.some(w => w.worktree && w.worktree.includes('job-wt-1')));

      // Comprobar aislamiento: escribir un archivo en el worktree
      fs.writeFileSync(path.join(wtPath, 'worktree-only.txt'), 'Aislado', 'utf-8');
      assert.ok(fs.existsSync(path.join(wtPath, 'worktree-only.txt')));
      assert.ok(!fs.existsSync(path.join(testRepoRoot, 'worktree-only.txt')));

      // Limpiar worktree
      worktreeManager.removeWorktree('job-wt-1');
      assert.ok(!fs.existsSync(wtPath));
    });
  });

  describe('4. Integridad de pruebas y detección de manipulación (FoFo test-lock)', function () {
    let fofoDriver;
    let lockTestDir;

    before(function () {
      fofoDriver = new FoFoDriver();
      lockTestDir = path.join(tempDir, 'fofo-lock-test');
      fs.mkdirSync(path.join(lockTestDir, 'test', 'unit'), { recursive: true });

      // Escribir prueba ficticia
      fs.writeFileSync(
        path.join(lockTestDir, 'test', 'unit', 'sample.test.js'),
        'describe("sample", () => { it("works", () => {}); });',
        'utf-8'
      );
    });

    it('debe congelar pruebas con hash sha256 en TEST-LOCK.json', function () {
      const writeRes = fofoDriver.writeTestLock(lockTestDir, 'test/unit/**/*.test.js');
      assert.strictEqual(writeRes.exitCode, 0);
      assert.ok(fs.existsSync(path.join(lockTestDir, 'TEST-LOCK.json')));

      const lockData = JSON.parse(fs.readFileSync(path.join(lockTestDir, 'TEST-LOCK.json'), 'utf-8'));
      assert.ok(lockData.files && Object.keys(lockData.files).length > 0);
    });

    it('debe verificar exitosamente si las pruebas no han sido modificadas', function () {
      const verifyRes = fofoDriver.verifyTestLock(lockTestDir, 'test/unit/**/*.test.js');
      assert.strictEqual(verifyRes.exitCode, 0);
      assert.strictEqual(verifyRes.passed, true);
    });

    it('debe detectar manipulación y FALLAR si el Author modifica la prueba bloqueada', function () {
      // Modificar el archivo de prueba (simulando trampa de un Author)
      fs.appendFileSync(
        path.join(lockTestDir, 'test', 'unit', 'sample.test.js'),
        '\n// linea modificada por autor para trucar test'
      );

      const tamperRes = fofoDriver.verifyTestLock(lockTestDir, 'test/unit/**/*.test.js');
      assert.strictEqual(tamperRes.exitCode, 1); // Exit code 1: HARD FAIL
      assert.strictEqual(tamperRes.passed, false);

      // Restaurar el contenido original
      fs.writeFileSync(
        path.join(lockTestDir, 'test', 'unit', 'sample.test.js'),
        'describe("sample", () => { it("works", () => {}); });',
        'utf-8'
      );
      const restoredRes = fofoDriver.verifyTestLock(lockTestDir, 'test/unit/**/*.test.js');
      assert.strictEqual(restoredRes.exitCode, 0);
    });
  });

  describe('5. Escaneo de secretos (FoFo secret-scan)', function () {
    let fofoDriver;
    let secretTestDir;

    before(function () {
      fofoDriver = new FoFoDriver();
      secretTestDir = path.join(tempDir, 'fofo-secret-test');
      fs.mkdirSync(secretTestDir, { recursive: true });
    });

    it('debe detectar credenciales y tokens expuestos', function () {
      fs.writeFileSync(path.join(secretTestDir, 'leaked.js'), 'const awsKey = "AKIA1234567890ABCDEF";', 'utf-8');
      const scanRes = fofoDriver.runSecretScan(secretTestDir, 'leaked.js');
      assert.strictEqual(scanRes.exitCode, 1);
      assert.strictEqual(scanRes.passed, false);
    });

    it('debe pasar limpiamente si no existen secretos', function () {
      fs.writeFileSync(path.join(secretTestDir, 'clean.js'), 'const safeUrl = "http://localhost:3000";', 'utf-8');
      const scanRes = fofoDriver.runSecretScan(secretTestDir, 'clean.js');
      assert.strictEqual(scanRes.exitCode, 0);
      assert.strictEqual(scanRes.passed, true);
    });
  });

  describe('6. Verificación de integración coordinada (IntegrationVerifier)', function () {
    let verifier;

    before(function () {
      verifier = new IntegrationVerifier(testRepoRoot);

      // Crear dos ramas no conflictivas
      execSync('git checkout -b feat/module-a main', { cwd: testRepoRoot, stdio: 'pipe' });
      fs.writeFileSync(path.join(testRepoRoot, 'moduleA.txt'), 'Modulo A', 'utf-8');
      execSync('git add moduleA.txt && git commit -m "add module A"', { cwd: testRepoRoot, stdio: 'pipe' });

      execSync('git checkout -b feat/module-b main', { cwd: testRepoRoot, stdio: 'pipe' });
      fs.writeFileSync(path.join(testRepoRoot, 'moduleB.txt'), 'Modulo B', 'utf-8');
      execSync('git add moduleB.txt && git commit -m "add module B"', { cwd: testRepoRoot, stdio: 'pipe' });

      // Volver a main
      execSync('git checkout main', { cwd: testRepoRoot, stdio: 'pipe' });
    });

    it('debe detectar cuando dos ramas se integran limpiamente sin conflictos', async function () {
      const report = await verifier.verifyIntegration(['feat/module-a', 'feat/module-b'], 'main');
      assert.strictEqual(report.conflicts.length, 0);
      assert.ok(report.mergedBranches.includes('feat/module-a'));
      assert.ok(report.mergedBranches.includes('feat/module-b'));
    });

    it('debe detectar conflictos cuando dos ramas modifican las mismas líneas de un archivo', async function () {
      // Crear rama conflictiva
      execSync('git checkout -b feat/conflict-branch main', { cwd: testRepoRoot, stdio: 'pipe' });
      fs.writeFileSync(path.join(testRepoRoot, 'moduleA.txt'), 'Contenido diferente que causara conflicto', 'utf-8');
      execSync('git add moduleA.txt && git commit -m "conflicting commit"', { cwd: testRepoRoot, stdio: 'pipe' });
      execSync('git checkout main', { cwd: testRepoRoot, stdio: 'pipe' });

      const report = await verifier.verifyIntegration(['feat/module-a', 'feat/conflict-branch'], 'main');
      assert.strictEqual(report.verdict, 'CONFLICT_DETECTED');
      assert.ok(report.conflicts.length > 0);
    });
  });

});
