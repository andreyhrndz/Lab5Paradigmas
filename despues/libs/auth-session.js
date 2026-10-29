// =============================================================================
// UNA Chat — Adaptador de sesión Auth0 para HTTP y Socket.IO
// =============================================================================
// La única fuente de verdad para una sesión es el contexto que crea el
// middleware público `auth()` de express-openid-connect. Ese middleware valida
// el flujo OIDC y la cookie cifrada antes de exponer `req.oidc`.
// =============================================================================

const { auth } = require('express-openid-connect');

/**
 * Crea el middleware oficial de Auth0 para Express.
 *
 * No se descifran ni se interpretan cookies aquí: el SDK valida la sesión,
 * incluyendo integridad, expiración y las comprobaciones OIDC de callback.
 *
 * @param {object} config - Configuración documentada de express-openid-connect.
 * @returns {import('express').RequestHandler}
 */
function createAuth0Middleware(config) {
  return auth(config);
}

/**
 * Obtiene un perfil solamente de un contexto Auth0 que ya fue validado.
 *
 * ASVS 7.2.1 y 9.1.1: la aplicación no acepta una cookie ni un JWT entregado
 * por el cliente como prueba de identidad; confía únicamente en la validación
 * de servidor realizada por `auth()` / `req.oidc.isAuthenticated()`.
 *
 * @param {object} request - Request de Express que ya atravesó auth().
 * @returns {{sub: string, name: string, email?: string, picture?: string}|null}
 */
function getAuthenticatedUser(request) {
  const oidc = request && request.oidc;

  if (!oidc || typeof oidc.isAuthenticated !== 'function') {
    return null;
  }

  let isAuthenticated;
  try {
    isAuthenticated = oidc.isAuthenticated();
  } catch (_error) {
    return null;
  }

  if (isAuthenticated !== true || !oidc.user || typeof oidc.user !== 'object') {
    return null;
  }

  const { sub, name, nickname, email, picture } = oidc.user;
  if (typeof sub !== 'string' || sub.trim().length === 0) {
    return null;
  }

  const displayName = [name, nickname, email].find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );

  return {
    sub,
    name: displayName || 'Usuario autenticado',
    ...(typeof email === 'string' && email.trim().length > 0 ? { email } : {}),
    ...(typeof picture === 'string' && picture.trim().length > 0
      ? { picture }
      : {}),
  };
}

/**
 * Protege el handshake de Socket.IO con el contexto ya autenticado por Auth0.
 *
 * El servidor debe ejecutar `createAuth0Middleware(config)` antes de llegar a
 * este adaptador y pasar el mismo request validado. La mera presencia de
 * `appSession` o de un encabezado Cookie nunca autoriza una conexión.
 *
 * @param {{getRequest?: (socket: object) => object}} [options]
 * @returns {function} middleware de Socket.IO (socket, next)
 */
function socketAuthMiddleware(options = {}) {
  const getRequest =
    typeof options.getRequest === 'function'
      ? options.getRequest
      : (socket) => socket && socket.request;

  return function requireAuthenticatedSocket(socket, next) {
    try {
      const user = getAuthenticatedUser(getRequest(socket));
      if (!user) {
        return next(new Error('Unauthorized: Authentication required'));
      }

      socket.data = socket.data || {};
      socket.data.user = user;
      return next();
    } catch (_error) {
      return next(new Error('Unauthorized: Authentication required'));
    }
  };
}

module.exports = {
  createAuth0Middleware,
  getAuthenticatedUser,
  socketAuthMiddleware,
};
