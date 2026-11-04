// Servidor UNA Chat — Express + Socket.IO + Auth0 (despues)

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { requiresAuth } = require('express-openid-connect');
const validation = require('./libs/unalib');
const {
  createAuth0Middleware,
  getAuthenticatedUser,
  socketAuthMiddleware,
} = require('./libs/auth-session');

const REQUIRED_AUTH0_VARIABLES = [
  'AUTH0_SECRET',
  'AUTH0_BASE_URL',
  'AUTH0_CLIENT_ID',
  'AUTH0_ISSUER_BASE_URL',
  'AUTH0_CLIENT_SECRET',
];

function getAuth0Config(environment = process.env) {
  const missing = REQUIRED_AUTH0_VARIABLES.filter(
    (name) => !environment[name] || !String(environment[name]).trim(),
  );

  if (missing.length > 0) {
    throw new Error(
      `Auth0 configuration is incomplete. Set: ${missing.join(', ')}`,
    );
  }

  if (String(environment.AUTH0_SECRET).length < 32) {
    throw new Error('AUTH0_SECRET must contain at least 32 characters.');
  }

  let baseURL;
  try {
    baseURL = new URL(environment.AUTH0_BASE_URL);
  } catch (_error) {
    throw new Error('AUTH0_BASE_URL must be a valid absolute URL.');
  }

  if (!['http:', 'https:'].includes(baseURL.protocol)) {
    throw new Error('AUTH0_BASE_URL must use HTTP or HTTPS.');
  }

  const production = environment.NODE_ENV === 'production';
  if (production && baseURL.protocol !== 'https:') {
    throw new Error('AUTH0_BASE_URL must use HTTPS in production.');
  }

  const secureCookie = baseURL.protocol === 'https:';

  return {
    authRequired: false,
    idpLogout: true,
    secret: environment.AUTH0_SECRET,
    baseURL: baseURL.origin,
    clientID: environment.AUTH0_CLIENT_ID,
    clientSecret: environment.AUTH0_CLIENT_SECRET,
    issuerBaseURL: environment.AUTH0_ISSUER_BASE_URL,
    authorizationParams: {
      response_type: 'code',
      scope: 'openid profile email',
      ...(environment.AUTH0_CONNECTION
        ? { connection: environment.AUTH0_CONNECTION }
        : {}),
    },
    session: {
      // ASVS 3.3.1: use a host-only prefix whenever HTTPS is available.
      name: secureCookie ? '__Host-appSession' : 'appSession',
      rolling: true,
      rollingDuration: 24 * 60 * 60,
      absoluteDuration: 7 * 24 * 60 * 60,
      cookie: {
        // ASVS 3.3.2 / 3.3.4: the session never reaches JavaScript and is
        // restricted to the host root. Plain HTTP is allowed only for localhost.
        httpOnly: true,
        secure: secureCookie,
        sameSite: 'Lax',
        path: '/',
      },
    },
  };
}

function isInitialSocketHandshake(request) {
  return !request._query || request._query.sid === undefined;
}

function applyBrowserSecurityHeaders(production) {
  return function browserSecurityHeaders(_req, res, next) {
    // The UI is a single inline-script document. Keep the policy explicit and
    // narrow its network destinations instead of relying on browser defaults.
    res.set({
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' https:",
        "connect-src 'self' ws: wss:",
        'frame-src https://www.youtube.com',
        "object-src 'none'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
    if (production) {
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}

function hasTrustedSocketOrigin(request, baseURL) {
  const origin = request.headers.origin;
  if (typeof origin === 'string') {
    return origin === baseURL;
  }

  // Chromium legitimately omits Origin on a same-origin GET polling request.
  // Accept that narrow browser case only when Fetch Metadata identifies the
  // request as same-origin *and* the authority equals the configured origin.
  // An absent Origin by itself is never sufficient to authorize a handshake.
  if (
    request.method !== 'GET' ||
    request.headers['sec-fetch-site'] !== 'same-origin'
  ) {
    return false;
  }

  let expected;
  try {
    expected = new URL(baseURL).host.toLowerCase();
  } catch (_error) {
    return false;
  }

  const forwardedHost = request.headers['x-forwarded-host'];
  const host = typeof forwardedHost === 'string'
    ? forwardedHost.split(',')[0].trim()
    : request.headers.host;
  return typeof host === 'string' && host.toLowerCase() === expected;
}

function getAuthenticatedMessage(msg, user) {
  let validatedMsg;
  try {
    validatedMsg = validation.validateMessage(msg);
  } catch (_error) {
    // A malformed event must be rejected without taking down its Socket.IO
    // handler, even if a future validator implementation regresses.
    return null;
  }

  let parsed;
  try {
    parsed = typeof validatedMsg === 'string' ? JSON.parse(validatedMsg) : validatedMsg;
  } catch (_error) {
    return null;
  }

  if (
    !parsed ||
    parsed.valid === false ||
    parsed.error != null ||
    (typeof parsed.mensaje === 'string' && parsed.mensaje.trim() === '') ||
    (typeof parsed.mensaje === 'string' && parsed.mensaje.length > 280) ||
    (typeof parsed.nombre === 'string' && parsed.nombre.trim() === '')
  ) {
    return null;
  }

  // ASVS 8.2.1: the sender is server-side session state, never client input.
  parsed.nombre = validation.sanitizeName(user.name);
  return JSON.stringify(parsed);
}

function createUnaChatServer(options = {}) {
  const environment = options.environment || process.env;
  const authConfig =
    options.authConfig ||
    (options.authMiddleware ? null : getAuth0Config(environment));
  const authMiddleware =
    options.authMiddleware || createAuth0Middleware(authConfig);
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  const production = environment.NODE_ENV === 'production';
  const socketSessionMaxAgeMs = Number.isInteger(options.socketSessionMaxAgeMs)
    && options.socketSessionMaxAgeMs > 0
    ? options.socketSessionMaxAgeMs
    : 30 * 1000;

  app.disable('x-powered-by');
  app.set('trust proxy', production ? 1 : false);
  app.use(applyBrowserSecurityHeaders(production));

  // ASVS 10.1.2: auth() owns state, nonce, PKCE and callback validation.
  app.use(authMiddleware);

  // Auth0's SDK registers /login, /callback and /logout itself. There are no
  // duplicate application routes for these endpoints.
  // The landing page contains no transcript or user data. It can explain how
  // to authenticate without turning the private chat into a static resource.
  app.get('/', function serveAuthenticationLanding(_req, res) {
    res.sendFile('index.html', { root: __dirname });
  });
  app.get('/chat', requiresAuth(), function servePrivateChat(_req, res) {
    res.sendFile('index.html', { root: __dirname });
  });
  app.get('/api/user', function getCurrentUser(req, res) {
    const user = getAuthenticatedUser(req);
    res.set('Cache-Control', 'no-store');

    if (!user) {
      return res.status(401).json({ authenticated: false });
    }

    // ASVS 7.2.1: only expose the allowlisted profile produced by the
    // validated server session. Tokens and raw session material stay server-side.
    return res.json({ authenticated: true, user });
  });
  app.post('/api/socket/session', function refreshSocketSession(req, res) {
    // This is a fresh HTTP request through auth(), so the SDK re-reads and
    // verifies the encrypted session before renewing a socket permit. The
    // opaque Socket.IO id is not an identity credential: it must already map
    // to a socket whose handshake user has the same validated subject.
    const user = getAuthenticatedUser(req);
    const socketId = req.get('X-Socket-ID');
    const socket = typeof socketId === 'string'
      ? io.sockets.sockets.get(socketId)
      : undefined;

    res.set('Cache-Control', 'no-store');
    if (!user || !socket || !socket.data.user || socket.data.user.sub !== user.sub) {
      return res.status(401).end();
    }

    socket.data.user = user;
    socket.data.sessionVerifiedUntil = Date.now() + socketSessionMaxAgeMs;
    return res.status(204).end();
  });
  const privateAssetsDir = path.resolve(__dirname, 'private-assets');
  app.use('/public', requiresAuth(), function servePrivateAsset(req, res, next) {
    // Vercel Serverless Functions ignore express.static() and serve root public/
    // from CDN before Express. To prevent CDN bypass while ensuring compatibility
    // in serverless runtimes, private assets reside in private-assets/ and are
    // streamed directly using fs under the authenticated /public route.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    const rawSubpath = (req.path || '').replace(/^\/+/, '');
    const safeSubpath = path.normalize(rawSubpath).replace(/^(\.\.[\/\\])+/, '');
    const targetPath = path.resolve(privateAssetsDir, safeSubpath);

    if (
      targetPath !== privateAssetsDir &&
      !targetPath.startsWith(privateAssetsDir + path.sep)
    ) {
      return res.status(403).send('Forbidden');
    }

    fs.stat(targetPath, (err, stats) => {
      if (err || !stats.isFile()) {
        return res.status(404).send('Not Found');
      }

      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.css': 'text/css; charset=UTF-8',
        '.js': 'application/javascript; charset=UTF-8',
        '.json': 'application/json; charset=UTF-8',
        '.txt': 'text/plain; charset=UTF-8',
      };
      const ext = path.extname(targetPath).toLowerCase();
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, no-cache');

      const stream = fs.createReadStream(targetPath);
      stream.on('error', next);
      stream.pipe(res);
    });
  });
  app.use(function handleAuthCallbackError(error, req, res, next) {
    if (req.path === '/callback') {
      // Do not reflect IdP or state-validation details into the browser.
      const reason = req.query && req.query.error === 'access_denied'
        ? 'login_cancelled'
        : 'login_failed';
      return res.redirect(302, `/?authError=${reason}`);
    }
    return next(error);
  });

  // Engine.IO receives raw HTTP requests, not requests that crossed app.use().
  // A full Express router cannot run during a direct WebSocket upgrade because
  // Engine.IO provides a reduced response object there. Require the initial
  // polling handshake (a normal HTTP request), where the public Auth0 middleware
  // can safely attach the verified req.oidc context before any upgrade occurs.
  const handshakeApp = express();
  handshakeApp.disable('x-powered-by');
  handshakeApp.set('trust proxy', production ? 1 : false);
  handshakeApp.use(authMiddleware);
  io.engine.use(function authenticateInitialHandshake(req, res, next) {
    if (!isInitialSocketHandshake(req)) {
      return next();
    }
    if (req._query.transport !== 'polling') {
      return next(new Error('Socket.IO requires an authenticated polling handshake.'));
    }
    if (production && (!authConfig || !hasTrustedSocketOrigin(req, authConfig.baseURL))) {
      return next(new Error('Socket.IO origin is not allowed.'));
    }
    return handshakeApp(req, res, next);
  });

  io.use(socketAuthMiddleware());

  io.on('connection', function(socket) {
    socket.on('Evento-Mensaje-Server', function(msg) {
      // A socket begins with no event permit. The browser must renew it using
      // /api/socket/session, which traverses a *new* auth() request and thus
      // observes SDK expiry/logout rather than a frozen handshake context.
      if (
        !Number.isFinite(socket.data.sessionVerifiedUntil) ||
        socket.data.sessionVerifiedUntil <= Date.now()
      ) {
        socket.disconnect(true);
        return;
      }

      const validatedMsg = getAuthenticatedMessage(msg, socket.data.user);
      if (!validatedMsg) {
        return;
      }

      io.emit('Evento-Mensaje-Server', validatedMsg);
    });
  });

  return { app, http: server, io, authConfig };
}

let defaultServer;
try {
  const defaultRuntime = createUnaChatServer();
  defaultServer = defaultRuntime.http;
} catch (_error) {
  defaultServer = http.createServer();
}

defaultServer.default = defaultServer;
defaultServer.server = defaultServer;
defaultServer.createUnaChatServer = createUnaChatServer;
defaultServer.getAuth0Config = getAuth0Config;
defaultServer.getAuthenticatedMessage = getAuthenticatedMessage;
defaultServer.applyBrowserSecurityHeaders = applyBrowserSecurityHeaders;
defaultServer.hasTrustedSocketOrigin = hasTrustedSocketOrigin;

if (require.main === module) {
  try {
    const port = process.env.PORT || 3000;
    defaultServer.listen(port, function() {
      console.log('listening on *:' + port);
    });
  } catch (error) {
    console.error(`Unable to start UNA Chat: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = defaultServer;
