// @req: REQ-012
const assert = require('assert');
const unalib = require('../../libs/unalib');

describe('REQ-012 (Unit) — Límite de 280 caracteres en unalib', function () {
  it('debe rechazar o invalidar mensajes que superen los 280 caracteres en JSON', function () {
    const longMsg = 'A'.repeat(281);
    const input = JSON.stringify({ mensaje: longMsg, nombre: 'UsuarioTest', color: '#000000' });
    const rawRes = unalib.validateMessage(input);
    let parsed = null;
    try { parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes; } catch (e) {}
    const isAcceptedExceeding = parsed && parsed.valid !== false && !parsed.error && parsed.mensaje && parsed.mensaje.length > 280;
    assert.strictEqual(Boolean(isAcceptedExceeding), false, 'Mensaje > 280 caracteres no debe ser aceptado sin truncamiento ni invalidación');
  });

  it('debe aceptar mensajes de hasta 280 caracteres exactos', function () {
    const exactMsg = 'A'.repeat(280);
    const input = JSON.stringify({ mensaje: exactMsg, nombre: 'UsuarioTest', color: '#000000' });
    const rawRes = unalib.validateMessage(input);
    let parsed = null;
    try { parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes; } catch (e) {}
    assert.ok(parsed && parsed.mensaje, 'Mensaje de 280 caracteres debe ser procesado legítimamente');
  });
});
