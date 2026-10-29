const { test, expect } = require('@playwright/test');
const { authenticate } = require('./auth-fixture');

test.describe('UNA Chat — interfaz de autenticación', () => {
  test('muestra el estado no autenticado y la acción de login', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Iniciar sesión con Auth0' })).toHaveAttribute('href', '/login');
    await expect(page.locator('#authenticated-view')).toBeHidden();
    await expect(page.locator('#profile')).toBeHidden();
  });

  test('explica un fallo de callback sin exponer el detalle del proveedor', async ({ page }) => {
    await page.goto('/?authError=login_failed');
    await expect(page.getByRole('status')).toHaveText('No fue posible iniciar sesión. Inténtalo de nuevo.');
    await expect(page.locator('#authenticated-view')).toBeHidden();
  });

  test('muestra nombre, email y avatar del contexto de sesión simulado', async ({ page, context }) => {
    await authenticate(context);
    await page.goto('/');
    await expect(page.getByText('Persona E2E autenticada')).toBeVisible();
    await expect(page.getByText('e2e@example.test')).toBeVisible();
    await expect(page.locator('#user-avatar')).toHaveAttribute('src', /images\.example\.test/);
    await expect(page.getByRole('link', { name: 'Cerrar sesión' })).toHaveAttribute('href', '/logout');
  });

  test('login y logout cambian el estado usando sólo el contexto controlado de E2E', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Iniciar sesión con Auth0' }).click();
    await expect(page.getByText('Persona E2E autenticada')).toBeVisible();
    await page.getByRole('link', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('link', { name: 'Iniciar sesión con Auth0' })).toBeVisible();
  });
});
