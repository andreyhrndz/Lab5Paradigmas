const { test, expect } = require('@playwright/test');
const { authenticate } = require('./auth-fixture');

test.describe('UNA Chat — interfaz de autenticación', () => {
  test('muestra el estado no autenticado y la acción de login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Iniciar sesión con Auth0' })).toHaveAttribute('href', '/login');
    await expect(page.locator('#authenticated-view')).toBeHidden();
    await expect(page.locator('#profile')).toBeHidden();
    await expect(page.locator('#auth-status')).toHaveAttribute('role', 'status');
    await expect(page.locator('#auth-status')).toHaveText('No hay una sesión autenticada.');
  });

  test('explica un fallo de callback sin exponer el detalle del proveedor', async ({ page }) => {
    await page.goto('/?authError=login_failed');
    await expect(page.locator('#auth-notice')).toHaveText('No fue posible iniciar sesión. Inténtalo de nuevo.');
    await expect(page.locator('#authenticated-view')).toBeHidden();
  });

  test('explica la cancelación controlada del proveedor y ofrece volver a intentar', async ({ page }) => {
    await page.goto('/?authError=login_cancelled');
    await expect(page.locator('#auth-notice')).toHaveText('Inicio de sesión cancelado. Puedes intentarlo de nuevo.');
    await expect(page.getByRole('link', { name: 'Iniciar sesión con Auth0' })).toBeVisible();
  });

  test('distingue una falla transitoria de perfil del estado anónimo y permite reintentar', async ({ page }) => {
    var requests = 0;
    await page.route('**/api/user', (route) => {
      requests += 1;
      return route.fulfill({ status: 503, body: 'Unavailable' });
    });
    await page.goto('/');
    await expect(page.locator('#session-error-notice')).toHaveText('No fue posible comprobar tu sesión. Inténtalo de nuevo.');
    await expect(page.getByRole('button', { name: 'Reintentar comprobación de sesión' })).toBeVisible();
    await expect(page.locator('#unauthenticated-view')).toBeHidden();
    await expect(page.locator('#session-error-view')).toBeVisible();
    await page.getByRole('button', { name: 'Reintentar comprobación de sesión' }).click();
    await expect.poll(() => requests).toBe(2);
  });

  test('muestra nombre, email y avatar del contexto de sesión simulado', async ({ page, context }) => {
    await authenticate(context);
    await page.goto('/');
    await expect(page.locator('#user-name')).toHaveText('Persona E2E autenticada');
    await expect(page.getByText('e2e@example.test')).toBeVisible();
    await expect(page.locator('#user-avatar')).toHaveAttribute('src', /images\.example\.test/);
    await expect(page.getByRole('link', { name: 'Cerrar sesión' })).toHaveAttribute('href', '/logout');
    await expect(page.locator('#auth-status')).toHaveText('Sesión autenticada como Persona E2E autenticada.');
    await expect(page.locator('#m')).toHaveAttribute('placeholder', 'Escribe un mensaje');
  });

  test('login y logout cambian el estado usando sólo el contexto controlado de E2E', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Iniciar sesión con Auth0' }).click();
    await expect(page.locator('#user-name')).toHaveText('Persona E2E autenticada');
    await page.getByRole('link', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('link', { name: 'Iniciar sesión con Auth0' })).toBeVisible();
  });
});
