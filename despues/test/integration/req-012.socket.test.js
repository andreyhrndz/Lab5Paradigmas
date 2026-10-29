// @req: REQ-012
const assert = require('assert');
const ioClient = require('socket.io-client');
const { http, io } = require('../../server');

describe('REQ-012 (Integration) — Rechazo de mensajes > 280 chars en Socket.IO', function () {
  this.timeout(10000);
  let port;
  let serverInstance;
  let clientA;
  let clientB;

  before(function (done) {
    serverInstance = http.listen(0, function () {
      port = serverInstance.address().port;
      clientA = ioClient(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });
      clientA.on('connect', function () {
        clientB = ioClient(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true });
        clientB.on('connect', done);
      });
    });
  });

  after(function (done) {
    if (clientA && clientA.connected) clientA.disconnect();
    if (clientB && clientB.connected) clientB.disconnect();
    io.close(done);
  });

  it('el servidor no debe retransmitir mensajes de más de 280 caracteres', function (done) {
    let receivedExcessive = false;
    const longMsg = 'X'.repeat(300);
    clientB.on('Evento-Mensaje-Server', function (msg) {
      try {
        const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
        if (data && data.mensaje && data.mensaje.length > 280) {
          receivedExcessive = true;
        }
      } catch (e) {}
    });

    clientA.emit('Evento-Mensaje-Server', JSON.stringify({ mensaje: longMsg, nombre: 'TestUser', color: '#111111' }));

    setTimeout(() => {
      assert.strictEqual(receivedExcessive, false, 'El servidor no debió retransmitir mensaje de más de 280 caracteres');
      done();
    }, 600);
  });
});
