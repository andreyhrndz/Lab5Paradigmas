const http = require('http');

module.exports = async function stopAuthTestServer() {
  const port = process.env.PORT || 3000;

  await new Promise((resolve) => {
    const request = http.get(`http://localhost:${port}/__test__/shutdown`, (response) => {
      response.resume();
      response.once('end', resolve);
    });
    request.setTimeout(2000, () => {
      request.destroy();
      resolve();
    });
    request.once('error', resolve);
  });
};
