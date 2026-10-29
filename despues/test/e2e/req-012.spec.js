// @req: REQ-012
const { test, expect } = require('@playwright/test');

test.describe('REQ-012 (E2E) — Límite de 280 caracteres en navegador', () => {
  test('no debe agregar mensaje >280 chars al transcript, conserva texto en campo y notifica', async ({ page }) => {
    await page.goto('/');
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    const initialCount = await page.locator('#messages li').count();
    const longText = 'C'.repeat(290);
    await page.locator('#nombre').fill('UsuarioTest');
    await page.locator('#m').fill(longText);
    await page.locator('button[type="submit"]').click();

    // 1. SHALL NOT add that message to the transcript
    await expect(page.locator('#messages li')).toHaveCount(initialCount);

    // 2. SHALL keep the message text in the field
    const fieldVal = await page.locator('#m').inputValue();
    expect(fieldVal).toBe(longText);

    // 3. SHALL tell the visitor the message is too long
    const hasDomNotice = (await page.locator('text=/too long|demasiado largo|largo|280/i').count()) > 0;
    const toldVisitor = Boolean(dialogMessage && /too long|demasiado largo|largo|280/i.test(dialogMessage)) || hasDomNotice;
    expect(toldVisitor).toBe(true);
  });
});
