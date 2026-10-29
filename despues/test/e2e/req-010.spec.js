// @req: REQ-010
const { test, expect } = require('@playwright/test');

test.describe('REQ-010 (E2E) — Validación de mensajes vacíos en navegador', () => {
  test('no debe agregar al transcript, mantiene campo vacío y notifica escribir algo', async ({ page }) => {
    await page.goto('/');
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    const initialCount = await page.locator('#messages li').count();
    await page.locator('#nombre').fill('UsuarioTest');
    await page.locator('#m').fill('   ');
    await page.locator('button[type="submit"]').click();

    // 1. SHALL NOT add a message to the transcript
    await expect(page.locator('#messages li')).toHaveCount(initialCount);

    // 2. SHALL keep the message field empty
    const msgVal = await page.locator('#m').inputValue();
    expect(msgVal.trim()).toBe('');

    // 3. SHALL tell the visitor to write something
    const hasDomNotice = (await page.locator('text=/escriba|write|algo|mensaje|empty/i').count()) > 0;
    const toldVisitor = Boolean(dialogMessage && /escriba|write|algo|mensaje|empty/i.test(dialogMessage)) || hasDomNotice;
    expect(toldVisitor).toBe(true);
  });
});
