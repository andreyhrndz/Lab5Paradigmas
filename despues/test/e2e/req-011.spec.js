// @req: REQ-011
const { test, expect } = require('@playwright/test');
const { authenticate } = require('./auth-fixture');

test.describe('REQ-011 (E2E) — identidad de sesión no editable', () => {
  test('no presenta campo de nombre y muestra la identidad autenticada', async ({ page, context }) => {
    await authenticate(context);
    await page.goto('/');
    await expect(page.getByText('Persona E2E autenticada')).toBeVisible();
    await expect(page.locator('#nombre')).toHaveCount(0);
    await expect(page.getByText('Tu identidad se asigna desde el servidor.')).toBeVisible();
  });
});
