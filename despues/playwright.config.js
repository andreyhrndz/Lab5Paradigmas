// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const port = process.env.PORT || 3000;

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'on',
  },
  webServer: {
    command: 'node server.js',
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
});
