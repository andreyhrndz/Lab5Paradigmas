// @req: REQ-011
const { createRuntime, noMessage } = require('./socket-auth-test-helpers');

describe('REQ-011 (Integration) — la identidad procede de la sesión autenticada', function () {
  let fixture; let port;
  before(async function () { fixture = createRuntime(); port = await fixture.start(); });
  after(async function () { await fixture.stop(); });
  it('no retransmite un payload que intenta imponer un nombre vacío', async function () {
    const socket = await fixture.connect(port);
    await noMessage(socket, () => socket.emit('Evento-Mensaje-Server', JSON.stringify({ nombre: '   ', mensaje: 'Hola', color: '#111111' })));
  });
});
