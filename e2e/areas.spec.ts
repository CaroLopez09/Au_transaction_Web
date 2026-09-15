import { expect, test } from '@playwright/test';
import { collectConsoleErrors, expectNoAxeViolations, fetchOnboarding, signIn } from './support';

/** Áreas de tesorería y cumplimiento contra el BFF real (sin fixtures): estados honestos con los datos actuales. */
const AREAS = [
  { path: '/cuentas', heading: 'Cuentas' },
  { path: '/depositos', heading: 'Depósitos' },
  { path: '/destinatarios', heading: 'Destinatarios' },
  { path: '/pagos', heading: 'Pagos' },
  { path: '/solicitudes', heading: 'Solicitudes de información' },
];

test.describe('Áreas de tesorería y cumplimiento con el BFF real', () => {
  test('la navegación ofrece las siete áreas y cada una carga sin errores ni violaciones de accesibilidad', async ({
    page,
  }) => {
    const errors = collectConsoleErrors(page);
    await signIn(page, 'admin@juriscop.test');
    await expect(page).toHaveURL(/\/$/);
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav.getByRole('link')).toHaveText([
      '',
      'Inicio',
      'Vinculación',
      'Cuentas',
      'Depósitos',
      'Destinatarios',
      'Pagos',
      'Solicitudes',
    ]);
    for (const area of AREAS) {
      await nav
        .getByRole('link', {
          name: area.heading === 'Solicitudes de información' ? 'Solicitudes' : area.heading,
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(new RegExp(`${area.path}$`));
      await expect(page.getByRole('heading', { level: 1, name: area.heading })).toBeVisible();
      await expect(page.locator('au-skeleton')).toHaveCount(0);
      await expectNoAxeViolations(page);
    }
    // Los 422/503 del BFF son respuestas esperadas en este entorno; los errores de la app, no.
    expect(errors.filter((message) => !message.includes('Failed to load resource'))).toEqual([]);
  });

  test('sin vinculación aprobada, preparar pagos y registrar destinatarios muestran por qué no se puede', async ({
    page,
  }) => {
    await signIn(page, 'treasury.maker@juriscop.test', '/pagos/nuevo');
    await expect(page).toHaveURL(/\/pagos\/nuevo$/);
    const onboarding = await fetchOnboarding(page);
    test.skip(onboarding.status === 'VERIFIED', 'La organización ya está verificada: el bloqueo no aplica.');
    await expect(page.getByRole('heading', { name: 'Todavía no se pueden preparar pagos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cotizar' })).toHaveCount(0);

    await page.goto('/destinatarios/nuevo');
    await expect(page.getByRole('heading', { name: 'Todavía no se pueden registrar destinatarios' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /^ACH/ })).toHaveCount(0);
  });

  test('un rol de consulta no ve acciones de escritura y no puede entrar por URL a las pantallas de alta', async ({
    page,
  }) => {
    await signIn(page, 'read.only@juriscop.test', '/pagos');
    await expect(page.getByRole('heading', { level: 1, name: 'Pagos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nuevo pago' })).toHaveCount(0);

    await page.goto('/pagos/nuevo');
    await expect(page).toHaveURL('/');
    await page.goto('/destinatarios/nuevo');
    await expect(page).toHaveURL('/');
    await page.goto('/destinatarios');
    await expect(page.getByRole('link', { name: 'Registrar destinatario' })).toHaveCount(0);
  });

  test('un recurso de otra organización o inexistente muestra el mensaje del BFF, no una pantalla rota', async ({
    page,
  }) => {
    await signIn(page, 'admin@juriscop.test', '/pagos/no-existe');
    await expect(page.getByRole('alert')).toContainText('Pago no encontrado.');
    await page.goto('/cuentas/no-existe');
    await expect(page.getByRole('alert')).toContainText('Cuenta virtual no encontrada.');
  });

  test('@mobile las áreas de tesorería se adaptan y siguen siendo accesibles', async ({ page }) => {
    await signIn(page, 'admin@juriscop.test', '/pagos');
    await expect(page.getByRole('heading', { level: 1, name: 'Pagos' })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.goto('/solicitudes');
    await expect(page.getByRole('heading', { level: 1, name: 'Solicitudes de información' })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
