const assert = require('assert');
const path = require('path');
const fs = require('fs');
const RedValidator = require('../core/red-validator');

describe('Harness Autónomo — Validación Rigurosa TDD RED (RedValidator)', function () {
  this.timeout(20000);

  const testRoot = path.resolve(__dirname, '..', '..');
  const tempTestDir = path.resolve(testRoot, 'despues', 'test', 'unit', 'temp_red_suite');
  let redValidator;

  before(function () {
    if (!fs.existsSync(tempTestDir)) {
      fs.mkdirSync(tempTestDir, { recursive: true });
    }
    redValidator = new RedValidator(testRoot);
  });

  after(function () {
    if (fs.existsSync(tempTestDir)) {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
  });

  it('1. Debe aceptar como ROJO válido una prueba que falla por AssertionError', async function () {
    const filePath = path.join(tempTestDir, 'valid_red.test.js');
    fs.writeFileSync(filePath, `
const assert = require('assert');
describe('REQ-RED-001', function () {
  it('debe fallar por aserción esperada', function () {
    assert.strictEqual(true, false, 'Condición esperada aún no implementada');
  });
});
    `, 'utf-8');

    const res = await redValidator.validateRedTest(filePath);
    assert.strictEqual(res.isRed, true);
    assert.strictEqual(res.category, 'assertion-failure');
    assert(res.summary.includes('aserción(es) fallaron'));
  });

  it('2. Debe RECHAZAR una prueba que falla por SyntaxError', async function () {
    const filePath = path.join(tempTestDir, 'syntax_err.test.js');
    fs.writeFileSync(filePath, `
const assert = require('assert');
describe('REQ-RED-002', function () {
  it('error sintáctico', function () {
    const variable = ; // Error de sintaxis intencional
  });
});
    `, 'utf-8');

    const res = await redValidator.validateRedTest(filePath);
    assert.strictEqual(res.isRed, false);
    assert.strictEqual(res.category, 'syntax-error');
    assert(res.summary.includes('SyntaxError'));
  });

  it('3. Debe RECHAZAR una prueba que falla por dependencia inexistente (MODULE_NOT_FOUND)', async function () {
    const filePath = path.join(tempTestDir, 'missing_dep.test.js');
    fs.writeFileSync(filePath, `
const nonexistent = require('./modulo_totalmente_inexistente_xyz_123');
describe('REQ-RED-003', function () {
  it('modulo ausente', function () {});
});
    `, 'utf-8');

    const res = await redValidator.validateRedTest(filePath);
    assert.strictEqual(res.isRed, false);
    assert.strictEqual(res.category, 'missing-dependency');
    assert(res.summary.includes('MODULE_NOT_FOUND'));
  });

  it('4. Debe RECHAZAR una prueba que falla por Timeout excedido', async function () {
    const filePath = path.join(tempTestDir, 'timeout.test.js');
    fs.writeFileSync(filePath, `
describe('REQ-RED-004', function () {
  this.timeout(50);
  it('timeout intencional', function (done) {
    // Nunca llama a done()
  });
});
    `, 'utf-8');

    const res = await redValidator.validateRedTest(filePath);
    assert.strictEqual(res.isRed, false);
    assert.strictEqual(res.category, 'timeout');
    assert(res.summary.includes('Timeout'));
  });

  it('5. Debe RECHAZAR una prueba que pasa en VERDE antes de implementar (violación TDD)', async function () {
    const filePath = path.join(tempTestDir, 'already_green.test.js');
    fs.writeFileSync(filePath, `
const assert = require('assert');
describe('REQ-RED-005', function () {
  it('pasa inmediatamente', function () {
    assert.strictEqual(1, 1);
  });
});
    `, 'utf-8');

    const res = await redValidator.validateRedTest(filePath);
    assert.strictEqual(res.isRed, false);
    assert.strictEqual(res.category, 'already-green');
    assert(res.summary.includes('VERDE'));
  });

  it('6. Debe RECHAZAR una prueba que falla por error de runtime no-aserción (TypeError)', async function () {
    const filePath = path.join(tempTestDir, 'runtime_err.test.js');
    fs.writeFileSync(filePath, `
describe('REQ-RED-006', function () {
  it('caída por TypeError', function () {
    const obj = null;
    obj.metodoInexistente();
  });
});
    `, 'utf-8');

    const res = await redValidator.validateRedTest(filePath);
    assert.strictEqual(res.isRed, false);
    assert.strictEqual(res.category, 'runtime-error');
    assert(res.summary.includes('no-aserción') || res.summary.includes('TypeError') || res.summary.includes('reading'));
  });
});
