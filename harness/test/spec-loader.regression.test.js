const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SpecLoader = require('../core/spec-loader');
const JudgeAgent = require('../agents/judge-agent');
const AuthorAgent = require('../agents/author-agent');
const FoFoDriver = require('../core/fofo-driver');

describe('Harness Autónomo — Pruebas de Especificaciones Formales, Cargador y Archivos Autorizados', function () {
  this.timeout(10000);

  const repoRoot = path.resolve(__dirname, '..', '..');
  let specLoader;
  let tempWorktree;

  before(function () {
    specLoader = new SpecLoader(repoRoot);
    tempWorktree = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-spec-test-'));
    fs.mkdirSync(path.join(tempWorktree, 'despues', 'libs'), { recursive: true });
    fs.mkdirSync(path.join(tempWorktree, 'despues', 'public'), { recursive: true });
    fs.writeFileSync(path.join(tempWorktree, 'despues', 'libs', 'unalib.js'), 'module.exports = {};');
    fs.writeFileSync(path.join(tempWorktree, 'despues', 'server.js'), '// server');
    fs.writeFileSync(path.join(tempWorktree, 'despues', 'index.html'), '<html></html>');
  });

  after(function () {
    try {
      fs.rmSync(tempWorktree, { recursive: true, force: true });
    } catch (e) {
      // Ignorar
    }
  });

  describe('1. Carga y Validación Estricta de Requerimientos Oficiales', function () {
    it('Debe cargar REQ-010 con el criterio de aceptación literal del PDF y escenarios completos', function () {
      const spec = specLoader.loadSpec('REQ-010');
      assert.strictEqual(spec.reqId, 'REQ-010');
      assert.strictEqual(
        spec.acceptance,
        'WHEN a visitor activates Send with an empty or whitespace-only message THEN the system SHALL NOT add a message to the transcript, SHALL keep the message field empty, and SHALL tell the visitor to write something.'
      );
      assert(spec.targetFiles.includes('despues/index.html'), 'Debe autorizar index.html para validación frontend');
      assert(spec.targetFiles.includes('despues/server.js'), 'Debe autorizar server.js para validación Socket.IO');
      assert(spec.targetFiles.includes('despues/libs/unalib.js'), 'Debe autorizar unalib.js para validación de biblioteca');
      assert(spec.testTemplates.unit, 'Debe incluir template de prueba unitaria');
      assert(spec.testTemplates.integration, 'Debe incluir template de prueba de integración Socket.IO');
      assert(spec.testTemplates.e2e, 'Debe incluir template de prueba E2E Playwright');
    });

    it('Debe cargar REQ-011 con el criterio de aceptación literal del PDF', function () {
      const spec = specLoader.loadSpec('REQ-011');
      assert.strictEqual(spec.reqId, 'REQ-011');
      assert.strictEqual(
        spec.acceptance,
        'WHEN a visitor activates Send with an empty or whitespace-only username and a real message THEN the system SHALL NOT add a message to the transcript, SHALL keep the username field empty, and SHALL tell the visitor to write a name.'
      );
      assert(spec.targetFiles.includes('despues/index.html'));
      assert(spec.targetFiles.includes('despues/server.js'));
    });

    it('Debe cargar REQ-012 con el criterio de aceptación literal del PDF', function () {
      const spec = specLoader.loadSpec('REQ-012');
      assert.strictEqual(spec.reqId, 'REQ-012');
      assert.strictEqual(
        spec.acceptance,
        'WHEN a visitor activates Send with a message longer than 280 characters THEN the system SHALL NOT add that message to the transcript, SHALL keep the message text in the field, and SHALL tell the visitor the message is too long.'
      );
      assert(spec.targetFiles.includes('despues/index.html'));
      assert(spec.targetFiles.includes('despues/server.js'));
    });

    it('Debe RECHAZAR requerimientos desconocidos impidiendo inventar criterios genéricos por defecto', function () {
      assert.throws(
        () => specLoader.loadSpec('REQ-UNKNOWN-999'),
        (err) => {
          return err.message.includes('[SpecLoader Error]') && err.message.includes('Requerimiento desconocido o sin especificación formal');
        },
        'Debió rechazar el requerimiento no catalogado'
      );
    });

    it('Debe listar todos los requerimientos disponibles en el catálogo', function () {
      const list = specLoader.listAvailableSpecs();
      assert(list.includes('REQ-010'));
      assert(list.includes('REQ-011'));
      assert(list.includes('REQ-012'));
    });
  });

  describe('2. Control de Autorización de Archivos y Blindaje de Pruebas', function () {
    it('Debe permitir la modificación de los tres archivos productivos autorizados (libs, server, index.html)', function () {
      const allowed = ['despues/libs/unalib.js', 'despues/server.js', 'despues/index.html'];
      const ok = specLoader.validateAllowedFiles(['despues/index.html', 'despues/server.js', 'despues/libs/unalib.js'], allowed);
      assert.strictEqual(ok, true);
    });

    it('Debe BLOQUEAR con Security Violation cualquier intento de Author de modificar pruebas en despues/test/', function () {
      assert.throws(
        () => specLoader.validateAllowedFiles(['despues/test/unit/req-010.test.js']),
        (err) => {
          return err.message.includes('[Security Violation]') && err.message.includes('archivo de prueba protegido');
        },
        'Debe prohibir alterar pruebas unitarias'
      );

      assert.throws(
        () => specLoader.validateAllowedFiles(['despues/test/e2e/req-010.spec.js']),
        (err) => {
          return err.message.includes('[Security Violation]');
        },
        'Debe prohibir alterar pruebas E2E'
      );
    });

    it('Debe rechazar archivos productivos fuera de la lista autorizada', function () {
      assert.throws(
        () => specLoader.validateAllowedFiles(['package.json'], ['despues/libs/unalib.js']),
        (err) => {
          return err.message.includes('[Authorization Error]');
        }
      );
    });
  });

  describe('3. Soporte Multi-Nivel de Judge (Unit, Socket.IO, Playwright)', function () {
    it('Debe generar pruebas unitarias, de integración y E2E Playwright a partir de la especificación', async function () {
      const judge = new JudgeAgent({ mockMode: true });
      const spec = specLoader.loadSpec('REQ-010');

      const result = await judge.generateRedTests(spec, tempWorktree);
      assert(result.generatedFiles.length >= 3, 'Debe haber generado al menos 3 suites de prueba (unit, socket, e2e)');

      // Verificar que los 3 archivos existen en sus respectivas carpetas
      const unitPath = path.join(tempWorktree, 'despues', 'test', 'unit', 'req-010.test.js');
      const socketPath = path.join(tempWorktree, 'despues', 'test', 'integration', 'req-010.socket.test.js');
      const e2ePath = path.join(tempWorktree, 'despues', 'test', 'e2e', 'req-010.spec.js');

      assert(fs.existsSync(unitPath), 'Prueba unitaria debe existir');
      assert(fs.existsSync(socketPath), 'Prueba de integración Socket.IO debe existir');
      assert(fs.existsSync(e2ePath), 'Prueba E2E Playwright debe existir');

      // Verificar trazabilidad FoFo en todos los archivos generados
      assert(fs.readFileSync(unitPath, 'utf-8').includes('// @req: REQ-010'));
      assert(fs.readFileSync(socketPath, 'utf-8').includes('// @req: REQ-010'));
      assert(fs.readFileSync(e2ePath, 'utf-8').includes('// @req: REQ-010'));
    });
  });

  describe('4. AuthorAgent: Modificación de los Tres Archivos Productivos y Blindaje de Pruebas', function () {
    it('Author debe poder aplicar parches en los tres archivos productivos autorizados', async function () {
      const author = new AuthorAgent({ mockMode: true });
      const spec = specLoader.loadSpec('REQ-010');

      spec.implementationPatches = [
        { file: 'despues/libs/unalib.js', apply: (c) => c + '\n// patch unalib' },
        { file: 'despues/server.js', apply: (c) => c + '\n// patch server' },
        { file: 'despues/index.html', apply: (c) => c + '\n<!-- patch html -->' }
      ];

      const res = await author.implement(spec, tempWorktree);
      assert.strictEqual(res.status, 'applied');
      assert.strictEqual(res.modifiedFiles.length, 3);
      assert(res.modifiedFiles.includes('despues/libs/unalib.js'));
      assert(res.modifiedFiles.includes('despues/server.js'));
      assert(res.modifiedFiles.includes('despues/index.html'));
    });

    it('Author debe rechazar implementaciones que intenten alterar archivos de pruebas bloqueadas', async function () {
      const author = new AuthorAgent({ mockMode: true });
      const spec = specLoader.loadSpec('REQ-010');

      await assert.rejects(
        async () => {
          await author.implement(spec, tempWorktree, async () => {
            return {
              modifiedFiles: ['despues/test/unit/req-010.test.js'],
              status: 'illegal'
            };
          });
        },
        /Security Violation/
      );
    });
  });

  describe('5. FoFo test-lock protegiendo todas las pruebas generadas', function () {
    it('FoFoDriver debe congelar y verificar con éxito todas las pruebas en despues/test/**/*', function () {
      const fofo = new FoFoDriver();
      const lockRes = fofo.writeTestLock(tempWorktree, 'despues/test/**/*');
      assert.strictEqual(lockRes.passed, true, 'test-lock write debió pasar');

      const verifyRes = fofo.verifyTestLock(tempWorktree, 'despues/test/**/*');
      assert.strictEqual(verifyRes.passed, true, 'test-lock verify debió pasar');
    });
  });
});
