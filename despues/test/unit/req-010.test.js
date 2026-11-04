// @req: REQ-010
const assert = require('assert');
const unalib = require('../../libs/unalib');

describe('REQ-010 (Unit) — Validación de mensajes vacíos en unalib', function () {
  it('debe rechazar mensajes con contenido vacío serializado como JSON', function () {
    const input = JSON.stringify({ mensaje: '', nombre: 'UsuarioTest', color: '#000000' });
    const rawRes = unalib.validateMessage(input);
    let parsed = null;
    try { parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes; } catch (e) {}
    const isRejected = rawRes === false || rawRes === null || (parsed && (parsed.valid === false || parsed.error != null));
    assert.strictEqual(Boolean(isRejected), true, 'Mensaje vacío en JSON debe ser rechazado');
  });

  it('debe rechazar mensajes compuestos solo de espacios en blanco', function () {
    const input = JSON.stringify({ mensaje: '     ', nombre: 'UsuarioTest', color: '#000000' });
    const rawRes = unalib.validateMessage(input);
    let parsed = null;
    try { parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes; } catch (e) {}
    const isRejected = rawRes === false || rawRes === null || (parsed && (parsed.valid === false || parsed.error != null));
    assert.strictEqual(Boolean(isRejected), true, 'Mensaje con solo espacios debe ser rechazado');
  });
});
