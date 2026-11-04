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
  const customSub = req.headers['x-test-user-sub'];
  const testUser = authenticated
    ? (customSub ? { ...verifiedUser, sub: customSub, name: 'Otro Usuario' } : verifiedUser)
    : undefined;
  req.oidc = {
    isAuthenticated: () => authenticated,
    user: testUser,
  };
  res.oidc = {
    login: () => res.status(401).send('Authentication required'),
  };
  next();
}

function httpRequest(port, requestPath, headers = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { hostname: '127.0.0.1', port, path: requestPath, headers, method },
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
    socket.once('connect', async () => {
      try {
        const response = await httpRequest(
          port,
          '/api/socket/session',
          { ...headers, 'x-socket-id': socket.id },
          'POST',
        );
        if (response.status !== 204) {
          socket.disconnect();
          return reject(new Error('Socket session refresh was rejected'));
        }
        return resolve(socket);
      } catch (error) {
        socket.disconnect();
        return reject(error);
      }
    });
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

  it('0. Exporta la instancia http.Server como export principal compatible con Vercel WebSocket Functions', function () {
    const serverExport = require('../../server');
    assert.ok(serverExport instanceof http.Server);
    assert.strictEqual(serverExport.default, serverExport);
    assert.strictEqual(serverExport.server, serverExport);
    assert.strictEqual(typeof serverExport.createUnaChatServer, 'function');
    assert.strictEqual(typeof serverExport.getAuth0Config, 'function');
    assert.strictEqual(typeof serverExport.categorizeAuth0InitError, 'function');
  });

  it('1. Informa una configuración incompleta sin crear una configuración ficticia', function () {
    assert.throws(
      () => getAuth0Config({}),
      /Auth0 configuration is incomplete/,
    );
  });

  it('1.1. Rechaza inicializar createUnaChatServer con configuración incompleta y no produce servidor válido', function () {
    assert.throws(
      () => createUnaChatServer({ environment: {} }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Auth0 configuration is incomplete/);
        assert.strictEqual(err.message.includes('test-secret'), false);
        return true;
      },
    );
  });

  it('1.2. Servidor con configuración incompleta responde 500 determinista sin colgarse ni filtrar secretos', async function () {
    const unconfiguredServer = http.createServer(function handleUnconfiguredServer(_req, res) {
      res.writeHead(500, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end('Server configuration error: Authentication configuration is incomplete or invalid.');
    });

    await new Promise((resolve) => unconfiguredServer.listen(0, resolve));
    const unconfiguredPort = unconfiguredServer.address().port;

    try {
      const response = await httpRequest(unconfiguredPort, '/');
      assert.strictEqual(response.status, 500);
      assert.match(response.body, /Server configuration error/);
      assert.strictEqual(response.headers['cache-control'], 'no-store');
      assert.strictEqual(response.body.includes('AUTH0_SECRET'), false);
    } finally {
      await new Promise((resolve) => unconfiguredServer.close(resolve));
    }
  });

  it('1.3. Categoriza diagnósticos de inicialización Auth0 de forma segura sin revelar tokens', function () {
    const { categorizeAuth0InitError } = require('../../server');

    const missingDiag = categorizeAuth0InitError(new Error('Auth0 configuration is incomplete. Set: AUTH0_SECRET'));
    assert.strictEqual(missingDiag.category, 'CONFIG_MISSING');
    assert.strictEqual(missingDiag.reason.includes('AUTH0_SECRET'), true);

    const invalidDiag = categorizeAuth0InitError(new Error('AUTH0_SECRET must contain at least 32 characters.'));
    assert.strictEqual(invalidDiag.category, 'CONFIG_INVALID');

    const sdkDiag = categorizeAuth0InitError(new TypeError('"issuerBaseURL" must be a valid uri'));
    assert.strictEqual(sdkDiag.category, 'AUTH0_SDK_ERROR');
    assert.match(sdkDiag.reason, /express-openid-connect validation error/);
  });

  it('1.4. Normaliza AUTH0_ISSUER_BASE_URL anteponiendo https a dominios sin esquema para prevenir rechazo del SDK', function () {
    const config = getAuth0Config({
      AUTH0_SECRET: 'test-only-secret-with-more-than-thirty-two-characters',
      AUTH0_BASE_URL: 'http://localhost:3000',
      AUTH0_CLIENT_ID: 'test-client-id',
      AUTH0_ISSUER_BASE_URL: 'dev-tenant123.us.auth0.com',
      AUTH0_CLIENT_SECRET: 'test-client-secret',
    });

    assert.strictEqual(config.issuerBaseURL, 'https://dev-tenant123.us.auth0.com');
  });

  it('1.5. Normaliza AUTH0_BASE_URL en producción anteponiendo https si se omite el esquema', function () {
    const config = getAuth0Config({
      NODE_ENV: 'production',
      AUTH0_SECRET: 'test-only-secret-with-more-than-thirty-two-characters',
      AUTH0_BASE_URL: 'una-chat-preview.vercel.app',
      AUTH0_CLIENT_ID: 'test-client-id',
      AUTH0_ISSUER_BASE_URL: 'https://dev-tenant123.us.auth0.com',
      AUTH0_CLIENT_SECRET: 'test-client-secret',
    });

    assert.strictEqual(config.baseURL, 'https://una-chat-preview.vercel.app');
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

  it('3.4. Sirve recursos privados de private-assets bajo /public con autenticación activa y previene traversal', async function () {
    const authedAsset = await httpRequest(port, '/public/sample.png', { 'x-test-auth': 'verified' });
    assert.strictEqual(authedAsset.status, 200);
    assert.strictEqual(authedAsset.headers['content-type'], 'image/png');
    assert.strictEqual(authedAsset.headers['cache-control'], 'private, no-cache');

    const missingAsset = await httpRequest(port, '/public/non-existent-sample.png', { 'x-test-auth': 'verified' });
    assert.strictEqual(missingAsset.status, 404);

    const traversalAttempt = await httpRequest(port, '/public/%2e%2e/server.js', { 'x-test-auth': 'verified' });
    assert.ok([403, 404].includes(traversalAttempt.status));
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

      const sameOriginPolling = await connect(productionPort, {
        'x-test-auth': 'verified',
        'x-forwarded-host': 'una-chat.example.test',
        'sec-fetch-site': 'same-origin',
      });
      assert.strictEqual(sameOriginPolling.connected, true);
      sameOriginPolling.disconnect();

      const originlessCrossSite = await rejectedConnection(productionPort, {
        'x-test-auth': 'verified',
        'x-forwarded-host': 'una-chat.example.test',
        'sec-fetch-site': 'cross-site',
      });
      assert.ok(originlessCrossSite instanceof Error);
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

  it('9.1. Rechaza un payload que sobrescribe hasOwnProperty sin interrumpir el chat', async function () {
    const socket = await connect(port, { 'x-test-auth': 'verified' });
    sockets.push(socket);

    const received = new Promise((resolve) => {
      socket.once('Evento-Mensaje-Server', resolve);
    });
    socket.emit(
      'Evento-Mensaje-Server',
      JSON.stringify({ hasOwnProperty: null, mensaje: 'Mensaje resistente' }),
    );

    const message = JSON.parse(await received);
    assert.strictEqual(message.nombre, verifiedUser.name);
    assert.strictEqual(message.mensaje, 'Mensaje resistente');
  });

  it('9.2. Desconecta el socket cuando una verificación HTTP nueva detecta la sesión vencida', async function () {
    let sessionIsValid = true;
    const expiringContext = (req, res, next) => {
      const authenticated = req.headers['x-test-auth'] === 'verified' && sessionIsValid;
      req.oidc = {
        isAuthenticated: () => authenticated,
        user: authenticated ? verifiedUser : undefined,
      };
      res.oidc = { login: () => res.status(401).end() };
      next();
    };
    const expiringRuntime = createUnaChatServer({
      authMiddleware: expiringContext,
      socketSessionMaxAgeMs: 25,
    });
    await new Promise((resolve) => expiringRuntime.http.listen(0, resolve));
    const expiringPort = expiringRuntime.http.address().port;

    try {
      const socket = await connect(expiringPort, { 'x-test-auth': 'verified' });
      sessionIsValid = false;
      const profileAfterExpiry = await httpRequest(expiringPort, '/api/user', {
        'x-test-auth': 'verified',
      });
      assert.strictEqual(profileAfterExpiry.status, 401);
      await new Promise((resolve) => setTimeout(resolve, 35));

      const disconnected = new Promise((resolve) => socket.once('disconnect', resolve));
      socket.emit('Evento-Mensaje-Server', JSON.stringify({ mensaje: 'No debe enviarse' }));
      await disconnected;
      assert.strictEqual(socket.connected, false);
    } finally {
      await new Promise((resolve) => expiringRuntime.io.close(resolve));
    }
  });

  it('9.3. Rechaza la renovación de permiso si la petición es anónima o el X-Socket-ID es inválido', async function () {
    const anonRes = await httpRequest(port, '/api/socket/session', {}, 'POST');
    assert.strictEqual(anonRes.status, 401);

    const invalidRes = await httpRequest(
      port,
      '/api/socket/session',
      { 'x-test-auth': 'verified', 'x-socket-id': 'non-existent-socket-id' },
      'POST',
    );
    assert.strictEqual(invalidRes.status, 401);
  });

  it('9.4. Impide que un usuario autenticado renueve el permiso de un socket ajeno', async function () {
    const socket = await connect(port, { 'x-test-auth': 'verified' });
    sockets.push(socket);

    const attackerAttempt = await httpRequest(
      port,
      '/api/socket/session',
      {
        'x-test-auth': 'verified',
        'x-test-user-sub': 'auth0|attacker-different-sub',
        'x-socket-id': socket.id,
      },
      'POST',
    );
    assert.strictEqual(attackerAttempt.status, 401);
  });

  it('9.5. Desconecta inmediatamente un socket que intenta emitir eventos sin renovar el permiso inicial', async function () {
    const rawSocket = ioClient(`http://127.0.0.1:${port}`, {
      forceNew: true,
      extraHeaders: { 'x-test-auth': 'verified' },
    });
    sockets.push(rawSocket);

    await new Promise((resolve, reject) => {
      rawSocket.once('connect', resolve);
      rawSocket.once('connect_error', reject);
    });

    const disconnected = new Promise((resolve) => rawSocket.once('disconnect', resolve));
    rawSocket.emit('Evento-Mensaje-Server', JSON.stringify({ mensaje: 'Sin permiso previo' }));
    await disconnected;
    assert.strictEqual(rawSocket.connected, false);
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
