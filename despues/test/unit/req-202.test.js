// @req: REQ-202
const assert = require('assert');
const unalib = require('../../libs/unalib');
describe('REQ-202', function () {
  it('debe validar la funcion dummy_2', function () {
    assert.strictEqual(typeof unalib.dummy_2, 'function', 'Debe existir la función');
  });
});