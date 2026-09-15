import { expect, test } from '@playwright/test';
import { collectConsoleErrors, expectNoAxeViolations, signIn } from './support';

/** Consola de operaciones con el operador de la plataforma sembrado en dev (operaciones@au.test). */
test.describe('Consola de operaciones y cumplimiento', () => {
  test('el operador de la plataforma solo ve la consola y abre la ficha 360 de un cliente', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await signIn(page, 'operaciones@au.test', '/operaciones');

    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav.getByRole('link')).toHaveText(['', 'Operaciones', 'Seguridad']);
    await expect(page.getByRole('heading', { level: 1, name: 'Operaciones y cumplimiento' })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole('tab', { name: 'Clientes' }).click();
    await page.getByRole('link', { name: 'Juriscop', exact: true }).click();
    await expect(page).toHaveURL(/\/operaciones\/juriscop$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Juriscop' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vinculación' })).toBeVisible();
    await expectNoAxeViolations(page);

    // Un área de empresa no existe para la plataforma: se vuelve a la consola.
    await page.goto('/pagos');
    await expect(page).toHaveURL(/\/operaciones$/);
    expect(errors.filter((message) => !message.includes('Failed to load resource'))).toEqual([]);
  });

  test('un rol de empresa no entra a la consola por URL', async ({ page }) => {
    await signIn(page, 'admin@juriscop.test', '/operaciones');
    await expect(page).not.toHaveURL(/\/operaciones/);
  });
});
