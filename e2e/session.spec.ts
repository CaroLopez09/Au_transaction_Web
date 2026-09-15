import { expect, test } from '@playwright/test';
import { collectConsoleErrors, expectNoAxeViolations, SEED_OPERATORS, seedPassword, signIn } from './support';

test.describe('Sesión', () => {
  test('sin sesión, una ruta protegida lleva al ingreso conservando el destino', async ({ page }) => {
    await page.goto('/vinculacion');
    await expect(page).toHaveURL(/\/ingresar\?volver=%2Fvinculacion$/);
    await expect(page.getByRole('heading', { name: 'Ingresar' })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('valida el formulario antes de llamar al BFF', async ({ page }) => {
    let loginCalls = 0;
    page.on('request', (request) => {
      if (request.url().endsWith('/api/auth/login')) loginCalls++;
    });
    await page.goto('/ingresar');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText('Escribe tu correo.')).toBeVisible();
    await expect(page.getByText('Escribe tu contraseña.')).toBeVisible();
    await page.getByLabel('Correo').fill('no-es-correo');
    await expect(page.getByText('Escribe un correo válido')).toBeVisible();
    await expect(page.getByLabel('Correo')).toHaveAttribute('aria-invalid', 'true');
    expect(loginCalls).toBe(0);
  });

  test('credenciales incorrectas muestran el mensaje del BFF y no revelan qué falló', async ({ page }) => {
    await page.goto('/ingresar');
    await page.getByLabel('Correo').fill(SEED_OPERATORS.juriscopAdmin);
    await page.getByLabel('Contraseña', { exact: true }).fill('contraseña-incorrecta');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByText('Credenciales invalidas.')).toBeVisible();
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
    await expect(page).toHaveURL(/\/ingresar/);
  });

  test('tras ingresar vuelve al destino pedido, y cerrar sesión borra el token', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await signIn(page, SEED_OPERATORS.juriscopAdmin, '/vinculacion');
    await expect(page).toHaveURL(/\/vinculacion$/);
    await expect(page.getByRole('heading', { name: 'Vinculación', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/ingresar$/);
    expect(await page.evaluate(() => sessionStorage.getItem('au.session'))).toBeNull();
    await page.goto('/');
    await expect(page).toHaveURL(/\/ingresar/);
    expect(errors).toEqual([]);
  });

  test('un token rechazado por el BFF (401) termina la sesión con aviso', async ({ page }) => {
    await signIn(page, SEED_OPERATORS.juriscopAdmin);
    await expect(page).toHaveURL(/\/$/);
    await page.evaluate(() => {
      const session = JSON.parse(sessionStorage.getItem('au.session')!);
      sessionStorage.setItem('au.session', JSON.stringify({ ...session, accessToken: 'token-manipulado' }));
    });
    await page.goto('/vinculacion');
    await expect(page).toHaveURL(/\/ingresar\?volver=%2Fvinculacion/);
    await expect(page.getByRole('status')).toContainText('Tu sesión terminó');

    await page.getByLabel('Correo').fill(SEED_OPERATORS.juriscopAdmin);
    await page.getByLabel('Contraseña', { exact: true }).fill(seedPassword());
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/vinculacion$/);
  });

  test('ignora destinos externos en ?volver', async ({ page, baseURL }) => {
    await signIn(page, SEED_OPERATORS.juriscopAdmin, 'https://evil.example');
    await expect(page).toHaveURL((url) => url.pathname === '/' && url.origin === new URL(baseURL!).origin);
  });
});
