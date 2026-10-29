// @req: REQ-203
const assert = require('assert');
const unalib = require('../../libs/unalib');
describe('REQ-203', function () {
  it('debe validar la funcion dummy_3', function () {
    assert.strictEqual(typeof unalib.dummy_3, 'function', 'Debe existir la función');
  });
});