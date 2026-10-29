// @req: REQ-010
const { test, expect } = require('@playwright/test');
const { authenticate } = require('./auth-fixture');

test.describe('REQ-010 (E2E) — validación de mensajes vacíos', () => {
  test('no agrega contenido vacío y explica cómo corregirlo', async ({ page, context }) => {
    await authenticate(context);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeEnabled();
    const initialCount = await page.locator('#messages li').count();
    await page.locator('#m').fill('   ');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.locator('#messages li')).toHaveCount(initialCount);
    await expect(page.locator('#m')).toHaveValue('');
    await expect(page.locator('#message-notice')).toContainText('Escriba un mensaje');
  });
});
