const ioClient = require('socket.io-client');
const { createUnaChatServer } = require('../../server');

const verifiedUser = {
  sub: 'google-oauth2|socket-test-user',
  name: 'Persona autenticada',
  email: 'persona@example.test',
};

// Test seam only: it represents an already verified req.oidc context. It does
// not emulate an OAuth exchange or validate a client-provided identity.
function verifiedContextForTests(req, res, next) {
  const authenticated = req.headers['x-test-auth'] === 'verified';
  req.oidc = {
    isAuthenticated: () => authenticated,
    user: authenticated ? verifiedUser : undefined,
  };
  res.oidc = { login: () => res.status(401).send('Authentication required') };
  next();
}

function createRuntime() {
  const runtime = createUnaChatServer({ authMiddleware: verifiedContextForTests });
  const sockets = [];

  return {
    runtime,
    sockets,
    async start() {
      await new Promise((resolve) => runtime.http.listen(0, resolve));
      return runtime.http.address().port;
    },
    connect(port) {
      const socket = ioClient(`http://127.0.0.1:${port}`, {
        forceNew: true,
        extraHeaders: { 'x-test-auth': 'verified' },
      });
      sockets.push(socket);
      return new Promise((resolve, reject) => {
        socket.once('connect', () => resolve(socket));
        socket.once('connect_error', reject);
      });
    },
    async stop() {
      sockets.forEach((socket) => socket.disconnect());
      await new Promise((resolve) => runtime.io.close(resolve));
      if (runtime.http.listening) await new Promise((resolve) => runtime.http.close(resolve));
    },
  };
}

function noMessage(socket, emit) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('Evento-Mensaje-Server', received);
      resolve();
    }, 300);
    function received() {
      clearTimeout(timer);
      reject(new Error('The invalid message was broadcast'));
    }
    socket.once('Evento-Mensaje-Server', received);
    emit();
  });
}

module.exports = { createRuntime, noMessage, verifiedUser };
