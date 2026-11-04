// Local E2E fixture only. It supplies a pre-validated req.oidc context after
// a test cookie is set; it does not simulate or assert a real OAuth exchange.
const cookie = require('cookie');
const { createUnaChatServer } = require('../../server');

const verifiedUser = {
  sub: 'google-oauth2|e2e-user',
  name: 'Persona E2E autenticada',
  email: 'e2e@example.test',
  picture: 'https://images.example.test/avatar.png',
};

function testAuthContext(req, res, next) {
  const cookies = cookie.parseCookie(req.headers.cookie || '');
  const authenticated = cookies.e2e_auth === 'verified';
  req.oidc = {
    isAuthenticated: () => authenticated,
    user: authenticated ? verifiedUser : undefined,
  };
  res.oidc = { login: () => res.status(401).send('Authentication required') };
  next();
}

const { app, http } = createUnaChatServer({ authMiddleware: testAuthContext });

// These routes exist only in this E2E process to exercise browser states. The
// production app receives these routes from the official Auth0 middleware.
app.get('/login', (_req, res) => {
  res.cookie('e2e_auth', 'verified', { httpOnly: true, sameSite: 'lax', path: '/' });
  res.redirect('/');
});
app.get('/logout', (_req, res) => {
  res.clearCookie('e2e_auth', { path: '/' });
  res.redirect('/');
});

app.get('/__test__/shutdown', (_req, res) => {
  res.status(204).end();
  setImmediate(stopTestServer);
});

const port = process.env.PORT || 3000;
http.listen(port, () => console.log(`E2E auth fixture listening on ${port}`));

function stopTestServer() {
  http.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}

// Playwright stops its webServer with a signal. Closing Socket.IO/HTTP first
// prevents an orphaned fixture from occupying port 3000 on Windows.
process.once('SIGINT', stopTestServer);
process.once('SIGTERM', stopTestServer);
