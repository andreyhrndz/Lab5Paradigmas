// @req: REQ-011
const { test, expect } = require('@playwright/test');

test.describe('REQ-011 (E2E) — Exigencia de nombre de usuario en navegador', () => {
  test('al enviar mensaje con username vacío no debe agregar transcript, mantiene username vacío y pide nombre', async ({ page }) => {
    await page.goto('/');
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    const initialCount = await page.locator('#messages li').count();
    await page.locator('#nombre').fill('   ');
    await page.locator('#m').fill('Mensaje legítimo');
    await page.locator('button[type="submit"]').click();

    // 1. SHALL NOT add a message to the transcript
    await expect(page.locator('#messages li')).toHaveCount(initialCount);

    // 2. SHALL keep the username field empty
    const nameVal = await page.locator('#nombre').inputValue();
    expect(nameVal.trim()).toBe('');

    // 3. SHALL tell the visitor to write a name
    const hasDomNotice = (await page.locator('text=/nombre|name|usuario/i').count()) > 0;
    const toldVisitor = Boolean(dialogMessage && /nombre|name|usuario/i.test(dialogMessage)) || hasDomNotice;
    expect(toldVisitor).toBe(true);
  });
});
