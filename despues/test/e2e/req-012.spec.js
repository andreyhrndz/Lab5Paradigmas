// @req: REQ-012
const { test, expect } = require('@playwright/test');
const { authenticate } = require('./auth-fixture');

test.describe('REQ-012 (E2E) — límite de 280 caracteres', () => {
  test('no agrega texto largo, lo conserva y notifica el límite', async ({ page, context }) => {
    await authenticate(context);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeEnabled();
    const initialCount = await page.locator('#messages li').count();
    const longText = 'C'.repeat(281);
    await page.locator('#m').fill(longText);
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.locator('#messages li')).toHaveCount(initialCount);
    await expect(page.locator('#m')).toHaveValue(longText);
    await expect(page.locator('#message-notice')).toContainText('máximo 280 caracteres');
  });
});
