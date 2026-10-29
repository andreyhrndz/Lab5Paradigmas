const assert = require('assert');
const { createRuntime, verifiedUser } = require('./socket-auth-test-helpers');

describe('UNA Chat — integración Socket.IO con sesión Auth0', function () {
  this.timeout(10000);
  let fixture;
  let port;

  before(async function () { fixture = createRuntime(); port = await fixture.start(); });
  after(async function () { await fixture.stop(); });

  async function send(message) {
    const socket = await fixture.connect(port);
    const received = new Promise((resolve) => socket.once('Evento-Mensaje-Server', resolve));
    socket.emit('Evento-Mensaje-Server', JSON.stringify(message));
    return JSON.parse(await received);
  }

  it('retransmite texto con la identidad autenticada, no la enviada por el cliente', async function () {
    const message = await send({ nombre: 'Suplantación', color: '#2ECC71', mensaje: 'Prueba de comunicación' });
    assert.strictEqual(message.nombre, verifiedUser.name);
    assert.strictEqual(message.mensaje, 'Prueba de comunicación');
    assert.strictEqual(message.tipo, 'text');
  });

  it('acepta una URL de imagen válida', async function () {
    const url = 'https://images.example.test/photo.png';
    const message = await send({ color: '#3498DB', mensaje: url });
    assert.strictEqual(message.nombre, verifiedUser.name);
    assert.strictEqual(message.tipo, 'image');
    assert.strictEqual(message.url, url);
  });

  it('acepta una URL de video de YouTube válida', async function () {
    const message = await send({ color: '#9B59B6', mensaje: 'https://www.youtube.com/watch?v=qYwlqx-JLok' });
    assert.strictEqual(message.tipo, 'video');
    assert.strictEqual(message.videoId, 'qYwlqx-JLok');
  });

  it('neutraliza script y manejadores de eventos antes de retransmitir', async function () {
    const script = await send({ color: '#E74C3C', mensaje: '<script>alert(1)</script>' });
    const handler = await send({ color: '#E67E22', mensaje: '<img src=x onerror=alert(1)>' });
    assert.ok(script.mensaje.includes('&lt;script&gt;'));
    assert.strictEqual(script.mensaje.includes('<script>'), false);
    assert.ok(handler.mensaje.includes('&lt;img'));
  });

  it('neutraliza protocolos peligrosos y texto JSON malformado', async function () {
    const socket = await fixture.connect(port);
    const first = new Promise((resolve) => socket.once('Evento-Mensaje-Server', resolve));
    socket.emit('Evento-Mensaje-Server', JSON.stringify({ color: '#1ABC9C', mensaje: 'javascript:alert(1)' }));
    const dangerous = JSON.parse(await first);
    assert.strictEqual(dangerous.mensaje.includes('javascript:'), false);

    const second = new Promise((resolve) => socket.once('Evento-Mensaje-Server', resolve));
    socket.emit('Evento-Mensaje-Server', '{ malformed <script>alert(1)</script>');
    const malformed = JSON.parse(await second);
    assert.strictEqual(malformed.nombre, verifiedUser.name);
    assert.strictEqual(malformed.tipo, 'text');
  });

  it('retransmite a dos clientes autenticados', async function () {
    const sender = await fixture.connect(port);
    const receiver = await fixture.connect(port);
    const received = new Promise((resolve) => receiver.once('Evento-Mensaje-Server', resolve));
    sender.emit('Evento-Mensaje-Server', JSON.stringify({ color: '#34495E', mensaje: 'Mensaje para todos' }));
    const message = JSON.parse(await received);
    assert.strictEqual(message.nombre, verifiedUser.name);
    assert.strictEqual(message.mensaje, 'Mensaje para todos');
  });
});
