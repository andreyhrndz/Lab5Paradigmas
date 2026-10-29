const assert = require('assert');
const {
  createAuth0Middleware,
  getAuthenticatedUser,
  socketAuthMiddleware,
} = require('../../libs/auth-session');

describe('Auth Session Helper — contexto verificado de Auth0 (Unit)', function () {
  const mockUser = {
    sub: 'google-oauth2|1092837465',
    name: 'Andrey Hernandez',
    email: 'andrey@una.ac.cr',
    picture: 'https://lh3.googleusercontent.com/a/avatar.png',
  };

  function authenticatedRequest(user = mockUser) {
    return {
      oidc: {
        isAuthenticated: () => true,
        user,
      },
    };
  }

  it('1. Crea el middleware público auth() de express-openid-connect', function () {
    const middleware = createAuth0Middleware({
      secret: 'un_secreto_de_prueba_de_mas_de_32_caracteres_aleatorios_12345',
      baseURL: 'https://una-chat.example.test',
      clientID: 'cliente-de-prueba',
      issuerBaseURL: 'https://tenant.example.auth0.com',
      authRequired: false,
    });

    assert.strictEqual(typeof middleware, 'function');
  });

  it('2. Acepta únicamente la identidad expuesta por un contexto Auth0 autenticado', function () {
    const result = getAuthenticatedUser(authenticatedRequest());

    assert.deepStrictEqual(result, mockUser);
  });

  it('3. Rechaza una cookie appSession aunque exista si Auth0 no la validó', function () {
    const requestWithForgedCookie = {
      headers: { cookie: 'appSession=not-a-validated-session' },
    };

    assert.strictEqual(getAuthenticatedUser(requestWithForgedCookie), null);
  });

  it('4. Rechaza sesiones no autenticadas, contextos incompletos y sujetos vacíos', function () {
    assert.strictEqual(
      getAuthenticatedUser({ oidc: { isAuthenticated: () => false, user: mockUser } }),
      null,
    );
    assert.strictEqual(
      getAuthenticatedUser({ oidc: { isAuthenticated: () => true, user: {} } }),
      null,
    );
    assert.strictEqual(
      getAuthenticatedUser({ oidc: { isAuthenticated: () => { throw new Error('bad context'); } } }),
      null,
    );
  });

  it('5. socketAuthMiddleware permite un request previamente autenticado y adjunta la identidad', function () {
    const socket = { request: authenticatedRequest(), data: {} };
    let nextError;

    socketAuthMiddleware()(socket, (error) => {
      nextError = error;
    });

    assert.strictEqual(nextError, undefined);
    assert.deepStrictEqual(socket.data.user, mockUser);
  });

  it('6. socketAuthMiddleware rechaza un request anónimo aunque incluya appSession', function () {
    const socket = {
      request: { headers: { cookie: 'appSession=forged' } },
      data: {},
    };
    let nextError;

    socketAuthMiddleware()(socket, (error) => {
      nextError = error;
    });

    assert.ok(nextError instanceof Error);
    assert.strictEqual(nextError.message, 'Unauthorized: Authentication required');
  });
});
