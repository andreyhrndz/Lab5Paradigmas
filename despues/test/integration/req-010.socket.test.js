// @req: REQ-010
const { createRuntime, noMessage } = require('./socket-auth-test-helpers');

describe('REQ-010 (Integration) — rechazo de mensajes vacíos autenticados', function () {
  let fixture; let port;
  before(async function () { fixture = createRuntime(); port = await fixture.start(); });
  after(async function () { await fixture.stop(); });
  it('no retransmite contenido vacío o espacios', async function () {
    const socket = await fixture.connect(port);
    await noMessage(socket, () => socket.emit('Evento-Mensaje-Server', JSON.stringify({ mensaje: '   ', color: '#111111' })));
  });
});
