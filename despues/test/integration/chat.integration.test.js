const assert = require('assert');
const ioClient = require('socket.io-client');
const { http, io } = require('../../server');

describe('UNA Chat — Pruebas de Integración con Socket.IO', function () {
  this.timeout(10000);

  let port;
  let serverInstance;
  let clientSocketA;
  let clientSocketB;

  // Iniciar servidor en puerto dinámico antes de las pruebas
  before(function (done) {
    serverInstance = http.listen(0, function () {
      port = serverInstance.address().port;
      done();
    });
  });

  // Cerrar servidor y sockets al finalizar la suite
  after(function (done) {
    if (clientSocketA && clientSocketA.connected) {
      clientSocketA.disconnect();
    }
    if (clientSocketB && clientSocketB.connected) {
      clientSocketB.disconnect();
    }
    io.close(function () {
      done();
    });
  });

  // Conectar cliente A antes de cada prueba
  beforeEach(function (done) {
    clientSocketA = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true
    });
    clientSocketA.on('connect', done);
  });

  // Desconectar sockets después de cada prueba
  afterEach(function () {
    if (clientSocketA && clientSocketA.connected) {
      clientSocketA.disconnect();
    }
    if (clientSocketB && clientSocketB.connected) {
      clientSocketB.disconnect();
    }
  });

  it('1. Debe recibir y retransmitir un mensaje de texto normal validado', function (done) {
    const testMsg = {
      nombre: 'UsuarioIntegracion',
      color: '#2ECC71',
      mensaje: 'Prueba de comunicacion por WebSockets'
    };

    clientSocketA.on('Evento-Mensaje-Server', function (msg) {
      const parsed = JSON.parse(msg);
      assert.strictEqual(parsed.nombre, 'UsuarioIntegracion');
      assert.strictEqual(parsed.color, '#2ECC71');
      assert.strictEqual(parsed.mensaje, 'Prueba de comunicacion por WebSockets');
      assert.strictEqual(parsed.tipo, 'text');
      done();
    });

    clientSocketA.emit('Evento-Mensaje-Server', JSON.stringify(testMsg));
  });

  it('2. Debe procesar mediante UNA Lib y aceptar una URL de imagen válida', function (done) {
    const testMsg = {
      nombre: 'UsuarioFoto',
      color: '#3498DB',
      mensaje: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675.jpg'
    };

    clientSocketA.on('Evento-Mensaje-Server', function (msg) {
      const parsed = JSON.parse(msg);
      assert.strictEqual(parsed.tipo, 'image');
      assert.strictEqual(parsed.url, 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675.jpg');
      assert.ok(parsed.mensaje.includes('<img'));
      assert.ok(parsed.mensaje.includes('max-height: 400px'));
      done();
    });

    clientSocketA.emit('Evento-Mensaje-Server', JSON.stringify(testMsg));
  });

  it('3. Debe procesar mediante UNA Lib y aceptar una URL de video de YouTube válida', function (done) {
    const testMsg = {
      nombre: 'UsuarioVideo',
      color: '#9B59B6',
      mensaje: 'https://www.youtube.com/watch?v=qYwlqx-JLok'
    };

    clientSocketA.on('Evento-Mensaje-Server', function (msg) {
      const parsed = JSON.parse(msg);
      assert.strictEqual(parsed.tipo, 'video');
      assert.strictEqual(parsed.videoId, 'qYwlqx-JLok');
      assert.ok(parsed.mensaje.includes('<iframe'));
      assert.ok(parsed.mensaje.includes('https://www.youtube.com/embed/qYwlqx-JLok'));
      done();
    });

    clientSocketA.emit('Evento-Mensaje-Server', JSON.stringify(testMsg));
  });

  it('4. Debe neutralizar intentos de inyección XSS con <script> antes de retransmitir', function (done) {
    const maliciousMsg = {
      nombre: 'AtacanteXSS',
      color: '#E74C3C',
      mensaje: "<script>alert('Inyección de script');</script>"
    };

    clientSocketA.on('Evento-Mensaje-Server', function (msg) {
      const parsed = JSON.parse(msg);
      assert.strictEqual(parsed.tipo, 'text');
      // No debe contener etiquetas de script ejecutables
      assert.strictEqual(parsed.mensaje.includes('<script>'), false);
      assert.strictEqual(parsed.mensaje.includes('&lt;script&gt;'), true);
      done();
    });

    clientSocketA.emit('Evento-Mensaje-Server', JSON.stringify(maliciousMsg));
  });

  it('5. Debe neutralizar vectores con manejadores de eventos (onerror)', function (done) {
    const maliciousMsg = {
      nombre: 'AtacanteImg',
      color: '#E67E22',
      mensaje: '<img src=x onerror=alert("pwned")>'
    };

    clientSocketA.on('Evento-Mensaje-Server', function (msg) {
      const parsed = JSON.parse(msg);
      assert.strictEqual(parsed.tipo, 'text');
      assert.strictEqual(parsed.mensaje.includes('<img'), false);
      assert.strictEqual(parsed.mensaje.includes('&lt;img'), true);
      done();
    });

    clientSocketA.emit('Evento-Mensaje-Server', JSON.stringify(maliciousMsg));
  });

  it('6. Debe rechazar y sanitizar protocolos peligrosos (javascript:)', function (done) {
    const maliciousMsg = {
      nombre: 'AtacanteJs',
      color: '#1ABC9C',
      mensaje: 'javascript:alert("hacked")'
    };

    clientSocketA.on('Evento-Mensaje-Server', function (msg) {
      const parsed = JSON.parse(msg);
      assert.strictEqual(parsed.tipo, 'text');
      assert.strictEqual(parsed.mensaje.includes('javascript:'), false);
      done();
    });

    clientSocketA.emit('Evento-Mensaje-Server', JSON.stringify(maliciousMsg));
  });

  it('7. Debe manejar cadenas JSON corruptas o no formateadas sin caerse el servidor', function (done) {
    clientSocketA.on('Evento-Mensaje-Server', function (msg) {
      const parsed = JSON.parse(msg);
      assert.ok(parsed.nombre);
      assert.ok(parsed.mensaje);
      assert.strictEqual(parsed.tipo, 'text');
      done();
    });

    // Enviar JSON inválido
    clientSocketA.emit('Evento-Mensaje-Server', '{ esto no es json { <script>alert(1)</script> ');
  });

  it('8. Debe retransmitir correctamente a múltiples clientes conectados en tiempo real', function (done) {
    clientSocketB = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true
    });

    clientSocketB.on('connect', function () {
      const broadcastMsg = {
        nombre: 'EmisorA',
        color: '#34495E',
        mensaje: 'Mensaje para todos los clientes conectados'
      };

      // Cliente B debe recibir el mensaje emitido por el Cliente A
      clientSocketB.on('Evento-Mensaje-Server', function (msg) {
        const parsed = JSON.parse(msg);
        assert.strictEqual(parsed.nombre, 'EmisorA');
        assert.strictEqual(parsed.mensaje, 'Mensaje para todos los clientes conectados');
        done();
      });

      clientSocketA.emit('Evento-Mensaje-Server', JSON.stringify(broadcastMsg));
    });
  });

});
