import { expect, test } from '@playwright/test';
import { collectConsoleErrors, expectNoAxeViolations, fetchOnboarding, SEED_OPERATORS, signIn } from './support';

test.describe('Inicio y Vinculación con datos reales del BFF', () => {
  test('Inicio muestra la organización y el rol de la sesión', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await signIn(page, SEED_OPERATORS.juriscopAdmin);
    await expect(page).toHaveURL(/\/$/);
    const onboarding = await fetchOnboarding(page);

    await expect(page.getByRole('heading', { level: 1, name: onboarding.name })).toBeVisible();
    await expect(page.getByText('Ingresaste con el rol Administración.')).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav.getByRole('link', { name: 'Vinculación', exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute('aria-current', 'page');
    await expectNoAxeViolations(page);
    expect(errors).toEqual([]);
  });

  test('Vinculación abre el asistente y solo ofrece consultar al proveedor si hay expediente', async ({ page }) => {
    await signIn(page, SEED_OPERATORS.juriscopAdmin, '/vinculacion');
    await expect(page).toHaveURL(/\/vinculacion$/);
    const onboarding = await fetchOnboarding(page);

    await expect(page.getByRole('navigation', { name: 'Pasos de la vinculación' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Empresa' })).toBeVisible();
    if (!onboarding.kiraUserId) {
      await expect(page.getByText('Sin iniciar').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Consultar estado' })).toHaveCount(0);
    } else {
      await expect(page.getByRole('button', { name: 'Consultar estado' })).toBeVisible();
    }
    await expectNoAxeViolations(page);
  });

  test('cada sesión ve solo su organización y los textos se adaptan al rol', async ({ page }) => {
    await signIn(page, SEED_OPERATORS.bankvisionReadOnly);
    await expect(page).toHaveURL(/\/$/);
    const onboarding = await fetchOnboarding(page);
    expect(onboarding.name).not.toBe('Juriscop');
    await expect(page.getByRole('heading', { level: 1, name: onboarding.name })).toBeVisible();
    await expect(page.getByText('Ingresaste con el rol Consulta.')).toBeVisible();
    if (!onboarding.kiraUserId) {
      await expect(page.getByText('Lo gestiona una persona con rol de Administración o Cumplimiento.')).toBeVisible();
    }
  });

  test('@mobile la navegación se abre como menú accesible', async ({ page }) => {
    await signIn(page, SEED_OPERATORS.juriscopAdmin);
    await expect(page).toHaveURL(/\/$/);
    const toggle = page.getByRole('button', { name: 'Abrir menú' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const nav = page.getByRole('navigation', { name: 'Principal', includeHidden: true });
    await expect(nav.getByRole('link', { name: 'Vinculación', exact: true, includeHidden: true })).toBeHidden();
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true');
    await nav.getByRole('link', { name: 'Vinculación', exact: true }).click();
    await expect(page).toHaveURL(/\/vinculacion$/);
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false');
    await expectNoAxeViolations(page);
  });
});
