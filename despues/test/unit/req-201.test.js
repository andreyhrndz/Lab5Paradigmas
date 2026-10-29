// @req: REQ-201
const assert = require('assert');
const unalib = require('../../libs/unalib');
describe('REQ-201', function () {
  it('debe validar la funcion dummy_1', function () {
    assert.strictEqual(typeof unalib.dummy_1, 'function', 'Debe existir la función');
  });
});