const { test, expect } = require('@playwright/test');

test.describe('UNA Chat — Pruebas End-to-End (E2E) con Playwright', () => {

  test.beforeEach(async ({ page }) => {
    // Monitor de errores no controlados en el contexto del navegador
    page.on('pageerror', error => {
      console.error('[Browser Uncaught Exception]', error.message);
    });

    await page.goto('/');
    await expect(page.getByPlaceholder('Escriba un mensaje')).toBeVisible();
  });

  test('1. Comunicación real entre navegador y servidor: envío y recepción de mensaje de texto', async ({ page }) => {
    await page.getByPlaceholder('Username').fill('UsuarioE2E');
    await page.getByPlaceholder('Escriba un mensaje').fill('Mensaje de prueba E2E en tiempo real');
    await page.getByRole('button', { name: 'Send' }).click();

    // Verificar que el mensaje aparece en la lista #messages
    const mensajeItem = page.locator('#messages li').last();
    await expect(mensajeItem).toContainText('UsuarioE2E: Mensaje de prueba E2E en tiempo real');
  });

  test('2. Envío y visualización de una imagen real con carga completa', async ({ page }) => {
    const port = process.env.PORT || 3000;
    const imageUrl = `http://localhost:${port}/sample.png`;
    await page.getByPlaceholder('Username').fill('FotografoE2E');
    await page.getByPlaceholder('Escriba un mensaje').fill(imageUrl);
    await page.getByRole('button', { name: 'Send' }).click();

    // Localizar la imagen creada dentro de #messages
    const imgLocator = page.locator('#messages img.chat-media').last();
    await expect(imgLocator).toBeVisible({ timeout: 5000 });
    await expect(imgLocator).toHaveAttribute('src', imageUrl);

    // Verificar que la imagen terminó de cargar satisfactoriamente (complete y naturalWidth > 0)
    const isLoaded = await imgLocator.evaluate(img => img.complete && img.naturalWidth > 0);
    expect(isLoaded).toBe(true);
  });

  test('3. Carga de un reproductor de video válido (YouTube)', async ({ page }) => {
    const videoUrl = 'https://www.youtube.com/watch?v=qYwlqx-JLok';
    await page.getByPlaceholder('Username').fill('CinefiloE2E');
    await page.getByPlaceholder('Escriba un mensaje').fill(videoUrl);
    await page.getByRole('button', { name: 'Send' }).click();

    // Localizar el iframe del reproductor
    const iframeLocator = page.locator('#messages iframe.chat-media').last();
    await expect(iframeLocator).toBeVisible({ timeout: 5000 });
    await expect(iframeLocator).toHaveAttribute('src', 'https://www.youtube.com/embed/qYwlqx-JLok');
  });

  test('4. Envío de script malicioso sin ejecución de JavaScript (Prevención XSS)', async ({ page }) => {
    let dialogTriggered = false;

    // Registrar listener page.on('dialog') ANTES del envío para detectar alertas
    page.on('dialog', async dialog => {
      dialogTriggered = true;
      console.error('[XSS DETECTED VIA DIALOG]', dialog.message());
      await dialog.dismiss();
    });

    const maliciousScript = "<script>alert('Inyección de script');</script>";
    await page.getByPlaceholder('Username').fill('AtacanteE2E');
    await page.getByPlaceholder('Escriba un mensaje').fill(maliciousScript);
    await page.getByRole('button', { name: 'Send' }).click();

    // Esperar a que el mensaje aparezca en la lista
    const mensajeItem = page.locator('#messages li').last();
    await expect(mensajeItem).toBeVisible();

    // Tiempo prudencial para confirmar ausencia de alert
    await page.waitForTimeout(1000);

    // Certificar que NINGÚN alert fue ejecutado
    expect(dialogTriggered).toBe(false);

    // Certificar que no existen etiquetas script activas en el DOM
    const rawScriptTagCount = await page.locator('#messages script').count();
    expect(rawScriptTagCount).toBe(0);
  });

  test('5. Envío de vector con manejador de eventos (onerror) sin ejecución', async ({ page }) => {
    let dialogTriggered = false;

    page.on('dialog', async dialog => {
      dialogTriggered = true;
      console.error('[XSS DETECTED VIA ONERROR]', dialog.message());
      await dialog.dismiss();
    });

    const eventPayload = '<img src="invalid_img" onerror="alert(\'XSS_FAIL\')">';
    await page.getByPlaceholder('Username').fill('AtacanteImg');
    await page.getByPlaceholder('Escriba un mensaje').fill(eventPayload);
    await page.getByRole('button', { name: 'Send' }).click();

    await page.waitForTimeout(1000);
    expect(dialogTriggered).toBe(false);

    // Debe mostrarse como texto plano seguro sin inyectar la etiqueta ni disparar onerror
    const mensajeItem = page.locator('#messages li').last();
    await expect(mensajeItem).toContainText('onerror=');
  });

});
