import { APIRequestContext, expect, test } from '@playwright/test';
import { collectConsoleErrors, expectNoAxeViolations, seedPassword, signIn } from './support';

/**
 * Asistente de vinculación contra el BFF real. El borrador es uno por organización (`au-colombia`):
 * la suite lo vacía al empezar y al terminar (PUT {} lo borra) para no dejar datos entre ejecuciones.
 * Nunca envía nada al proveedor: solo usa Guardar borrador y la navegación entre pasos.
 */
const COMPLIANCE = 'compliance.internal@au-colombia.test';
const READ_ONLY = 'read.only@au-colombia.test';
const QA_COMPANY = 'Empresa QA Borrador';

async function token(request: APIRequestContext, email: string): Promise<string> {
  const login = await request.post('/api/auth/login', { data: { email, password: seedPassword() } });
  expect(login.ok()).toBe(true);
  return (await login.json()).accessToken;
}

async function apiDraft(request: APIRequestContext): Promise<Record<string, Record<string, unknown>>> {
  const response = await request.get('/api/onboarding/draft', {
    headers: { Authorization: `Bearer ${await token(request, COMPLIANCE)}` },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()).draft;
}

async function clearDraft(request: APIRequestContext): Promise<void> {
  const response = await request.put('/api/onboarding/draft', {
    headers: { Authorization: `Bearer ${await token(request, COMPLIANCE)}` },
    data: { draft: {} },
  });
  expect(response.ok()).toBe(true);
}

test.describe.serial('Vinculación: asistente con borrador en el BFF', () => {
  test.beforeAll(async ({ request }) => clearDraft(request));
  test.afterAll(async ({ request }) => clearDraft(request));

  test('guarda el borrador, lo retoma al recargar y conserva el paso en la URL', async ({ page, request }) => {
    const errors = collectConsoleErrors(page);
    await signIn(page, COMPLIANCE, '/vinculacion');
    await expect(page.getByRole('heading', { level: 2, name: 'Empresa' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Empresa/ })).toHaveAttribute('aria-current', 'step');
    await expectNoAxeViolations(page);

    await page.getByLabel('Razón social').fill(QA_COMPANY);
    await page.getByLabel('Correo de la empresa').fill('qa@empresa.test');
    await expect(page.getByText('Cambios sin guardar')).toBeVisible();
    await page.getByRole('button', { name: 'Guardar borrador' }).click();
    await expect(page.getByText('Borrador guardado')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar borrador' })).toBeDisabled();

    const saved = await apiDraft(request);
    expect(saved['company']['business_legal_name']).toBe(QA_COMPANY);
    expect(saved['company']['email']).toBe('qa@empresa.test');

    await page.reload();
    await expect(page.getByLabel('Razón social')).toHaveValue(QA_COMPANY);
    await expect(page.getByLabel('Correo de la empresa')).toHaveValue('qa@empresa.test');

    // Cambiar de paso guarda lo pendiente sin pulsar Guardar borrador.
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page).toHaveURL(/paso=actividad/);
    await expect(page.getByRole('heading', { level: 2, name: 'Actividad y riesgo' })).toBeFocused();
    await expectNoAxeViolations(page);
    const sourceOfFunds = page.getByLabel('Origen de los fondos');
    const firstOption = await sourceOfFunds.locator('option').nth(1).getAttribute('value');
    await sourceOfFunds.selectOption(firstOption!);
    await page.getByRole('group', { name: '¿La empresa tiene antecedentes legales?' }).getByLabel('No').check();
    await page.getByRole('button', { name: 'Anterior' }).click();
    await expect(page).toHaveURL(/paso=empresa/);
    await expect(page.getByText('Borrador guardado')).toBeVisible();

    const afterStepChange = await apiDraft(request);
    expect(afterStepChange['activity']['source_of_funds']).toBe(firstOption);
    expect(afterStepChange['activity']['business_legal_history']).toBe('No');

    await page.goto('/vinculacion?paso=actividad');
    await expect(page.getByLabel('Origen de los fondos')).toHaveValue(firstOption!);
    await expect(
      page.getByRole('group', { name: '¿La empresa tiene antecedentes legales?' }).getByLabel('No'),
    ).toBeChecked();
    expect(errors).toEqual([]);
  });

  test('los pasos que dependen del expediente explican por qué no están disponibles', async ({ page }) => {
    await signIn(page, COMPLIANCE, '/vinculacion?paso=documentos');
    await expect(page.getByRole('heading', { level: 2, name: 'Documentos de la empresa' })).toBeVisible();
    const onboarding = await page.request.get('/api/onboarding', {
      headers: { Authorization: `Bearer ${await token(page.request, COMPLIANCE)}` },
    });
    if (!(await onboarding.json()).kiraUserId) {
      await expect(page.getByText('Los documentos se habilitan después de crear el expediente')).toBeVisible();
      await expect(page.getByRole('button', { name: /^Subir/ })).toHaveCount(0);
    }
    await expectNoAxeViolations(page);

    await page.goto('/vinculacion?paso=enviar');
    await expect(page.getByRole('heading', { level: 2, name: 'Enviar al proveedor' })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('un rol de consulta ve el borrador sin poder editarlo', async ({ page }) => {
    await signIn(page, READ_ONLY, '/vinculacion');
    await expect(page.getByText('Completa la vinculación una persona con rol de Administración')).toBeVisible();
    await expect(page.getByLabel('Razón social')).toHaveValue(QA_COMPANY);
    await expect(page.getByLabel('Razón social')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Guardar borrador' })).toHaveCount(0);

    await page.goto('/vinculacion?paso=beneficiarios');
    await expect(page.getByRole('button', { name: 'Registrar beneficiario' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Editar a / })).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test('@mobile el selector de pasos y las acciones del pie caben en pantalla', async ({ page }) => {
    await signIn(page, COMPLIANCE, '/vinculacion');
    const select = page.getByLabel('Paso', { exact: true });
    await expect(select).toBeVisible();
    for (const name of ['Anterior', 'Guardar borrador', 'Siguiente']) {
      await expect(page.getByRole('button', { name })).toBeInViewport({ ratio: 1 });
    }
    await select.selectOption('owners');
    await expect(page).toHaveURL(/paso=beneficiarios/);
    await expect(page.getByRole('heading', { level: 2, name: 'Beneficiarios' })).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await expectNoAxeViolations(page);
  });
});
