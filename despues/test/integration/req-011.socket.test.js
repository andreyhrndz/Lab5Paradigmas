// @req: REQ-011
const assert = require('assert');
const ioClient = require('socket.io-client');
const { http, io } = require('../../server');

describe('REQ-011 (Integration) — Rechazo de mensajes sin nombre en Socket.IO', function () {
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

  it('el servidor no debe retransmitir mensajes con nombre de usuario vacío o espacios', function (done) {
    let receivedInvalid = false;
    clientB.on('Evento-Mensaje-Server', function (msg) {
      try {
        const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
        if (!data || !data.nombre || data.nombre.trim() === '' || data.nombre === 'Anonimo') {
          receivedInvalid = true;
        }
      } catch (e) {}
    });

    clientA.emit('Evento-Mensaje-Server', JSON.stringify({ mensaje: 'Hola a todos', nombre: '   ', color: '#111111' }));

    setTimeout(() => {
      assert.strictEqual(receivedInvalid, false, 'El servidor no debió retransmitir mensaje sin nombre de usuario válido');
      done();
    }, 600);
  });
});
