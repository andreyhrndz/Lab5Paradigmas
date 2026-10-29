// @req: REQ-010
const assert = require('assert');
const ioClient = require('socket.io-client');
const { http, io } = require('../../server');

describe('REQ-010 (Integration) — Rechazo de mensajes vacíos en Socket.IO', function () {
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

  it('el servidor no debe retransmitir mensajes con contenido vacío o espacios', function (done) {
    let receivedInvalid = false;
    clientB.on('Evento-Mensaje-Server', function (msg) {
      try {
        const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
        if (!data || !data.mensaje || data.mensaje.trim() === '') {
          receivedInvalid = true;
        }
      } catch (e) {}
    });

    clientA.emit('Evento-Mensaje-Server', JSON.stringify({ mensaje: '   ', nombre: 'TestUser', color: '#111111' }));

    setTimeout(() => {
      assert.strictEqual(receivedInvalid, false, 'El servidor Socket.IO no debió retransmitir mensaje vacío');
      done();
    }, 600);
  });
});
