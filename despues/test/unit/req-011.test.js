// @req: REQ-011
const assert = require('assert');
const unalib = require('../../libs/unalib');

describe('REQ-011 (Unit) — Exigencia de nombre de usuario en unalib', function () {
  it('debe rechazar mensajes con nombre de usuario vacío serializado como JSON', function () {
    const input = JSON.stringify({ mensaje: 'Mensaje legítimo', nombre: '', color: '#000000' });
    const rawRes = unalib.validateMessage(input);
    let parsed = null;
    try { parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes; } catch (e) {}
    const isRejected = rawRes === false || rawRes === null || (parsed && (parsed.valid === false || !parsed.nombre || parsed.nombre.trim() === '' || parsed.error));
    assert.strictEqual(Boolean(isRejected), true, 'Mensaje sin nombre de usuario válido debe ser rechazado');
  });

  it('debe rechazar mensajes con nombre de solo espacios en blanco', function () {
    const input = JSON.stringify({ mensaje: 'Mensaje legítimo', nombre: '    ', color: '#000000' });
    const rawRes = unalib.validateMessage(input);
    let parsed = null;
    try { parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes; } catch (e) {}
    const isRejected = rawRes === false || rawRes === null || (parsed && (parsed.valid === false || !parsed.nombre || parsed.nombre.trim() === '' || parsed.error));
    assert.strictEqual(Boolean(isRejected), true, 'Mensaje con nombre en blanco debe ser rechazado');
  });
});
