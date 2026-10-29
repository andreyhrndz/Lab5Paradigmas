const { test, expect } = require('@playwright/test');
const { authenticate } = require('./auth-fixture');

test.describe('UNA Chat — comunicación autenticada', () => {
  test.beforeEach(async ({ page, context }) => {
    await authenticate(context);
    await page.goto('/');
    await expect(page.getByText('Persona E2E autenticada')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });

  test('envía un texto usando la identidad confirmada por el servidor', async ({ page }) => {
    await page.getByPlaceholder('Escriba un mensaje').fill('Mensaje de prueba E2E en tiempo real');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.locator('#messages li').last()).toContainText('Persona E2E autenticada: Mensaje de prueba E2E en tiempo real');
  });

  test('renderiza un script malicioso como texto sin ejecutarlo', async ({ page }) => {
    let dialogTriggered = false;
    page.on('dialog', async (dialog) => { dialogTriggered = true; await dialog.dismiss(); });
    await page.getByPlaceholder('Escriba un mensaje').fill("<script>alert('inyección')</script>");
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.locator('#messages li').last()).toContainText('&lt;script&gt;');
    await page.waitForTimeout(200);
    expect(dialogTriggered).toBe(false);
    await expect(page.locator('#messages script')).toHaveCount(0);
  });
});
