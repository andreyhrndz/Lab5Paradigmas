// @req: REQ-012
const { createRuntime, noMessage } = require('./socket-auth-test-helpers');

describe('REQ-012 (Integration) — rechazo de mensajes extensos autenticados', function () {
  let fixture; let port;
  before(async function () { fixture = createRuntime(); port = await fixture.start(); });
  after(async function () { await fixture.stop(); });
  it('no retransmite contenido de más de 280 caracteres', async function () {
    const socket = await fixture.connect(port);
    await noMessage(socket, () => socket.emit('Evento-Mensaje-Server', JSON.stringify({ mensaje: 'X'.repeat(281), color: '#111111' })));
  });
});
