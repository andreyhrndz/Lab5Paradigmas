const assert = require('assert');
const http = require('http');
const ioClient = require('socket.io-client');
const {
  createUnaChatServer,
  getAuth0Config,
} = require('../../server');

const verifiedUser = {
  sub: 'google-oauth2|integration-user',
  name: 'Persona autenticada',
  email: 'persona@example.test',
};

// This middleware is an integration-test seam, not an Auth0 login simulation.
// It represents the verified req.oidc context that the public Auth0 middleware
// supplies after it has completed a real OIDC flow in production.
function verifiedContextForTests(req, res, next) {
  if (
    (req.headers['x-test-auth'] === 'callback-error' || req.headers['x-test-auth'] === 'callback-cancelled')
    && req.path === '/callback'
  ) {
    return next(new Error('Controlled callback failure'));
  }

  const authenticated = req.headers['x-test-auth'] === 'verified';
  req.oidc = {
    isAuthenticated: () => authenticated,
    user: authenticated ? verifiedUser : undefined,
  };
  res.oidc = {
    login: () => res.status(401).send('Authentication required'),
  };
  next();
}

function httpRequest(port, requestPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { hostname: '127.0.0.1', port, path: requestPath, headers },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve({ status: response.statusCode, headers: response.headers, body });
        });
      },
    );
    request.on('error', reject);
    request.end();
  });
}

function connect(port, headers = {}) {
  const socket = ioClient(`http://127.0.0.1:${port}`, {
    forceNew: true,
    extraHeaders: headers,
  });

  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function rejectedConnection(port, headers = {}, socketOptions = {}) {
  const socket = ioClient(`http://127.0.0.1:${port}`, {
    forceNew: true,
    extraHeaders: headers,
    ...socketOptions,
  });

  return new Promise((resolve, reject) => {
    socket.once('connect', () => reject(new Error('The anonymous socket connected')));
    socket.once('connect_error', (error) => {
      socket.disconnect();
      resolve(error);
    });
  });
}

describe('US-01 Auth0 — HTTP y Socket.IO (Integration)', function () {
  this.timeout(10000);

  let runtime;
  let port;
  let sockets;

  before(function (done) {
    runtime = createUnaChatServer({ authMiddleware: verifiedContextForTests });
    sockets = [];
    runtime.http.listen(0, () => {
      port = runtime.http.address().port;
      done();
    });
  });

  afterEach(function () {
    sockets.forEach((socket) => socket.disconnect());
    sockets = [];
  });

  after(function (done) {
    runtime.io.close(() => {
      if (runtime.http.listening) {
        runtime.http.close(done);
      } else {
        done();
      }
    });
  });

  it('1. Informa una configuración incompleta sin crear una configuración ficticia', function () {
    assert.throws(
      () => getAuth0Config({}),
      /Auth0 configuration is incomplete/,
    );
  });

  it('2. Configura cookies seguras según el entorno y exige HTTPS en producción', function () {
    const shared = {
      AUTH0_SECRET: 'test-only-secret-with-more-than-thirty-two-characters',
      AUTH0_CLIENT_ID: 'test-client-id',
      AUTH0_ISSUER_BASE_URL: 'https://tenant.example.auth0.com',
      AUTH0_CLIENT_SECRET: 'test-client-secret',
    };
    const local = getAuth0Config({
      ...shared,
      AUTH0_BASE_URL: 'http://localhost:3000',
    });
    const production = getAuth0Config({
      ...shared,
      NODE_ENV: 'production',
      AUTH0_BASE_URL: 'https://una-chat.example.test',
    });

    assert.deepStrictEqual(local.session.cookie, {
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      path: '/',
    });
    assert.strictEqual(local.session.name, 'appSession');
    assert.strictEqual(production.session.cookie.secure, true);
    assert.strictEqual(production.session.name, '__Host-appSession');
    assert.throws(
      () =>
        getAuth0Config({
          ...shared,
          NODE_ENV: 'production',
          AUTH0_BASE_URL: 'http://localhost:3000',
        }),
      /must use HTTPS in production/,
    );
  });

  it('3. Muestra solamente la pantalla de acceso y protege el chat y los estáticos privados', async function () {
    const landing = await httpRequest(port, '/');
    const chat = await httpRequest(port, '/chat');
    const staticFile = await httpRequest(port, '/public/sample.png');
    const directIndex = await httpRequest(port, '/index.html');

    assert.strictEqual(landing.status, 200);
    assert.ok(landing.body.includes('Iniciar sesión con Auth0'));
    assert.strictEqual(chat.status, 401);
    assert.strictEqual(staticFile.status, 401);
    assert.strictEqual(directIndex.status, 404);
  });

  it('3.1. Envía cabeceras de navegador que restringen contenido, referencias y framing', async function () {
    const response = await httpRequest(port, '/');

    assert.strictEqual(response.status, 200);
    assert.match(response.headers['content-security-policy'], /default-src 'self'/);
    assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/);
    assert.strictEqual(response.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(response.headers['referrer-policy'], 'no-referrer');
    assert.strictEqual(response.headers['cross-origin-opener-policy'], 'same-origin');
  });

  it('3.2. Redirige los errores de callback a una reintento seguro sin divulgar detalles', async function () {
    const response = await httpRequest(port, '/callback', { 'x-test-auth': 'callback-error' });

    assert.strictEqual(response.status, 302);
    assert.strictEqual(response.headers.location, '/?authError=login_failed');
    assert.strictEqual(response.body.includes('Controlled callback failure'), false);
  });

  it('3.3. Distingue una cancelación del proveedor y mantiene el reintento en la misma aplicación', async function () {
    const response = await httpRequest(
      port,
      '/callback?error=access_denied',
      { 'x-test-auth': 'callback-cancelled' },
    );

    assert.strictEqual(response.status, 302);
    assert.strictEqual(response.headers.location, '/?authError=login_cancelled');
    assert.strictEqual(response.body.includes('Controlled callback failure'), false);
  });

  it('4. Expone sólo el perfil permitido desde un contexto Auth0 ya validado', async function () {
    const response = await httpRequest(port, '/api/user', { 'x-test-auth': 'verified' });

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(JSON.parse(response.body), {
      authenticated: true,
      user: verifiedUser,
    });
  });

  it('5. No expone perfil, token ni sesión a una petición anónima', async function () {
    const response = await httpRequest(port, '/api/user');

    assert.strictEqual(response.status, 401);
    assert.deepStrictEqual(JSON.parse(response.body), { authenticated: false });
  });

  it('5. Rechaza el handshake Socket.IO anónimo', async function () {
    const error = await rejectedConnection(port);

    assert.strictEqual(error.message, 'Unauthorized: Authentication required');
  });

  it('6. Rechaza una cookie appSession falsa', async function () {
    const error = await rejectedConnection(port, {
      cookie: 'appSession=forged-session-value',
    });

    assert.strictEqual(error.message, 'Unauthorized: Authentication required');
  });

  it('7. Rechaza WebSocket directo para impedir eludir la validación HTTP', async function () {
    const error = await rejectedConnection(
      port,
      { 'x-test-auth': 'verified' },
      { transports: ['websocket'] },
    );

    assert.ok(error instanceof Error);
  });

  it('8. Acepta una sesión previamente validada por Auth0', async function () {
    const socket = await connect(port, { 'x-test-auth': 'verified' });
    sockets.push(socket);

    assert.strictEqual(socket.connected, true);
  });

  it('8.1. Exige el Origin configurado para un handshake Socket.IO de producción', async function () {
    const environment = {
      NODE_ENV: 'production',
      AUTH0_SECRET: 'test-only-secret-with-more-than-thirty-two-characters',
      AUTH0_BASE_URL: 'https://una-chat.example.test',
      AUTH0_CLIENT_ID: 'test-client-id',
      AUTH0_ISSUER_BASE_URL: 'https://tenant.example.auth0.com',
      AUTH0_CLIENT_SECRET: 'test-client-secret',
    };
    const productionRuntime = createUnaChatServer({
      environment,
      authConfig: getAuth0Config(environment),
      authMiddleware: verifiedContextForTests,
    });
    await new Promise((resolve) => productionRuntime.http.listen(0, resolve));
    const productionPort = productionRuntime.http.address().port;

    try {
      const rejected = await rejectedConnection(productionPort, {
        'x-test-auth': 'verified',
        origin: 'https://attacker.example.test',
      });
      // Engine.IO intentionally hides middleware details from the client; the
      // relevant assertion is that the untrusted-origin socket never connects.
      assert.ok(rejected instanceof Error);

      const socket = await connect(productionPort, {
        'x-test-auth': 'verified',
        origin: environment.AUTH0_BASE_URL,
      });
      assert.strictEqual(socket.connected, true);
      socket.disconnect();
    } finally {
      await new Promise((resolve) => productionRuntime.io.close(resolve));
    }
  });

  it('9. Impone el remitente autenticado y rechaza la suplantación', async function () {
    const socket = await connect(port, { 'x-test-auth': 'verified' });
    sockets.push(socket);

    const received = new Promise((resolve) => {
      socket.once('Evento-Mensaje-Server', resolve);
    });
    socket.emit(
      'Evento-Mensaje-Server',
      JSON.stringify({
        nombre: 'Intento de suplantación',
        color: '#2ECC71',
        mensaje: 'Mensaje con identidad del servidor',
      }),
    );

    const message = JSON.parse(await received);
    assert.strictEqual(message.nombre, verifiedUser.name);
    assert.strictEqual(message.mensaje, 'Mensaje con identidad del servidor');
  });

  it('10. Conserva el saneamiento XSS antes de retransmitir', async function () {
    const socket = await connect(port, { 'x-test-auth': 'verified' });
    sockets.push(socket);

    const received = new Promise((resolve) => {
      socket.once('Evento-Mensaje-Server', resolve);
    });
    socket.emit(
      'Evento-Mensaje-Server',
      JSON.stringify({
        nombre: 'Nombre válido',
        color: '#E74C3C',
        mensaje: '<script>alert("xss")</script>',
      }),
    );

    const message = JSON.parse(await received);
    assert.strictEqual(message.nombre, verifiedUser.name);
    assert.strictEqual(message.mensaje.includes('<script>'), false);
    assert.strictEqual(message.mensaje.includes('&lt;script&gt;'), true);
  });

  it('11. Mantiene las regresiones REQ-010, REQ-011 y REQ-012 bloqueadas', async function () {
    const socket = await connect(port, { 'x-test-auth': 'verified' });
    sockets.push(socket);
    let received = false;
    socket.on('Evento-Mensaje-Server', () => {
      received = true;
    });

    socket.emit(
      'Evento-Mensaje-Server',
      JSON.stringify({ nombre: 'Nombre válido', color: '#111111', mensaje: '   ' }),
    );
    socket.emit(
      'Evento-Mensaje-Server',
      JSON.stringify({ nombre: '   ', color: '#111111', mensaje: 'Mensaje válido' }),
    );
    socket.emit(
      'Evento-Mensaje-Server',
      JSON.stringify({ nombre: 'Nombre válido', color: '#111111', mensaje: 'X'.repeat(281) }),
    );

    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.strictEqual(received, false);
  });
});
