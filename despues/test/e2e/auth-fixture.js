const port = process.env.PORT || 3000;

async function authenticate(context) {
  await context.addCookies([{
    name: 'e2e_auth',
    value: 'verified',
    url: `http://localhost:${port}`,
    httpOnly: true,
    sameSite: 'Lax',
  }]);
}

module.exports = { authenticate };
