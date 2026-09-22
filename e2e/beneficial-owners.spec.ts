import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { expectNoAxeViolations, seedPassword, signIn } from './support';

/**
 * Escribe en la base dev del BFF. El BFF no permite borrar beneficiarios (G-17), así que la suite
 * trabaja siempre sobre UN registro identificable en `au-colombia`: lo crea por la UI solo si no existe
 * y en adelante lo edita, sin acumular datos entre ejecuciones.
 */
const ADMIN = 'admin@au-colombia.test';
const APPROVER = 'treasury.approver@au-colombia.test';
const QA_OWNER = { firstName: 'Beneficiario QA', lastName: 'Frontend', fullName: 'Beneficiario QA Frontend' };

interface UboJson {
  id: string;
  fullName: string;
  firstName: string;
  ownershipPercentage: number;
  signer: boolean;
  countryOfBirth: string;
  beneficialOwner: boolean;
}

async function apiRoster(request: APIRequestContext, email: string): Promise<UboJson[]> {
  const login = await request.post('/api/auth/login', { data: { email, password: seedPassword() } });
  const { accessToken } = await login.json();
  const roster = await request.get('/api/ubos', { headers: { Authorization: `Bearer ${accessToken}` } });
  expect(roster.ok()).toBe(true);
  return (await roster.json()).members;
}

function drawer(page: Page) {
  return page.getByRole('dialog');
}

async function answer(page: Page, question: string, value: 'Sí' | 'No') {
  await drawer(page).getByRole('group', { name: question }).getByLabel(value, { exact: true }).check();
}

test.describe.serial('Beneficiarios finales: alta y edición contra el BFF', () => {
  test('un rol que solo aprueba pagos ve el grupo pero no las acciones de escritura', async ({ page }) => {
    await signIn(page, APPROVER, '/vinculacion?paso=beneficiarios');
    await expect(page.getByRole('heading', { level: 2, name: 'Beneficiarios' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar beneficiario' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Editar a / })).toHaveCount(0);
  });

  test('el formulario no llama al BFF si faltan respuestas y lleva el foco al primer error', async ({ page }) => {
    await signIn(page, ADMIN, '/vinculacion?paso=beneficiarios');
    let saves = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/ubos')) saves++;
    });
    await page.getByRole('button', { name: 'Registrar beneficiario' }).click();
    await expect(drawer(page)).toBeVisible();
    await expect(drawer(page).getByLabel('Nombre')).toBeFocused();
    await expectNoAxeViolations(page);

    await drawer(page).getByRole('button', { name: 'Registrar', exact: true }).click();
    await expect(drawer(page).getByText('Escribe el nombre.')).toBeVisible();
    await expect(drawer(page).getByText('Indica si la persona está expuesta políticamente.')).toBeVisible();
    await expect(drawer(page).getByLabel('Nombre')).toBeFocused();
    expect(saves).toBe(0);

    await page.keyboard.press('Escape');
    await expect(drawer(page)).toBeHidden();
    await expect(page.getByRole('button', { name: 'Registrar beneficiario' })).toBeFocused();
  });

  test('registra el beneficiario QA si no existe y queda persistido en el BFF', async ({ page, request }) => {
    await signIn(page, ADMIN, '/vinculacion?paso=beneficiarios');
    const before = await apiRoster(request, ADMIN);
    test.skip(
      before.some((owner) => owner.fullName === QA_OWNER.fullName),
      'El registro QA ya existe: se verifica la edición para no crear duplicados imborrables.',
    );

    await page.getByRole('button', { name: 'Registrar beneficiario' }).click();
    const form = drawer(page);
    await form.getByLabel('Nombre').fill(QA_OWNER.firstName);
    await form.getByLabel('Apellido').fill(QA_OWNER.lastName);
    await answer(page, '¿Tiene participación en la empresa?', 'Sí');
    await form.getByLabel('Porcentaje de participación').fill('60');
    await expect(form.getByText('Cuenta como beneficiario final.')).toBeVisible();
    await answer(page, '¿Ejerce control?', 'Sí');
    await answer(page, '¿Firma por la empresa?', 'No');
    await form.getByLabel('País de nacimiento').fill('COL');
    await answer(page, '¿Es una persona expuesta políticamente?', 'No');
    await form.getByRole('button', { name: 'Registrar', exact: true }).click();

    await expect(drawer(page)).toBeHidden();
    await expect(page.getByText(`${QA_OWNER.fullName}: beneficiario registrado.`)).toBeAttached();
    const created = (await apiRoster(request, ADMIN)).filter((owner) => owner.fullName === QA_OWNER.fullName);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ ownershipPercentage: 60, countryOfBirth: 'COL', beneficialOwner: true });
  });

  test('edita el beneficiario QA, persiste el cambio y lo restablece', async ({ page, request }) => {
    await signIn(page, ADMIN, '/vinculacion?paso=beneficiarios');
    const owners = await apiRoster(request, ADMIN);
    const qa = owners.find((owner) => owner.fullName === QA_OWNER.fullName);
    expect(qa, 'el registro QA debe existir tras el test de alta').toBeTruthy();

    const edit = page.getByRole('button', { name: `Editar a ${QA_OWNER.fullName}` });
    await edit.click();
    await expect(drawer(page).getByRole('heading', { name: 'Editar beneficiario' })).toBeVisible();
    // G-21 cerrado: el nombre llega precargado y se puede corregir.
    await expect(drawer(page).getByLabel('Nombre')).toHaveValue(qa!.firstName);
    await expect(drawer(page).getByLabel('Nombre')).toBeEditable();
    await expect(drawer(page).getByLabel('Porcentaje de participación')).toHaveValue(String(qa!.ownershipPercentage));

    const flipped = qa!.signer ? 'No' : 'Sí';
    await answer(page, '¿Firma por la empresa?', flipped);
    await drawer(page).getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(drawer(page)).toBeHidden();
    await expect(page.getByText(`${QA_OWNER.fullName}: cambios guardados.`)).toBeAttached();
    await expect(edit).toBeFocused();
    expect((await apiRoster(request, ADMIN)).find((owner) => owner.id === qa!.id)?.signer).toBe(!qa!.signer);

    await edit.click();
    await answer(page, '¿Firma por la empresa?', qa!.signer ? 'Sí' : 'No');
    await drawer(page).getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(drawer(page)).toBeHidden();
    const restored = (await apiRoster(request, ADMIN)).filter((owner) => owner.fullName === QA_OWNER.fullName);
    expect(restored).toHaveLength(1);
    expect(restored[0].signer).toBe(qa!.signer);
  });

  test('@mobile el drawer ocupa la pantalla y conserva las acciones al pie', async ({ page }) => {
    await signIn(page, ADMIN, '/vinculacion?paso=beneficiarios');
    await page.getByRole('button', { name: 'Registrar beneficiario' }).click();
    const box = await drawer(page).boundingBox();
    const viewport = page.viewportSize()!;
    expect(Math.round(box!.width)).toBe(viewport.width);
    await expect(drawer(page).getByRole('button', { name: 'Registrar', exact: true })).toBeInViewport();
    await expectNoAxeViolations(page);
  });
});
