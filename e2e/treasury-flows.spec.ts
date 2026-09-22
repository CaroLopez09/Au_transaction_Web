import { expect, test } from '@playwright/test';
import {
  fixtureAccount,
  fixtureOnboardingVerified,
  fixturePayout,
  fixtureQuotation,
  fixtureRecipient,
  fixtureRfi,
  respond,
  useContractFixtures,
} from './fixtures/contract-fixtures';
import { expectNoAxeViolations, signIn } from './support';

/**
 * Flujos de tesorería y cumplimiento con FIXTURES de contrato (ver fixtures/contract-fixtures.ts).
 * Verifican la UI y los cuerpos enviados; la integración real con el proveedor se valida cuando haya credenciales.
 */
const base = {
  'GET /api/onboarding': fixtureOnboardingVerified,
  'GET /api/ubos': { members: [], totalOwnership: 0, hasBeneficialOwner: false, livenessComplete: false },
  'GET /api/virtual-accounts': [fixtureAccount],
  'GET /api/recipients': [fixtureRecipient],
  'GET /api/payouts': [],
  'GET /api/rfis': [],
};

test.describe('Tesorería con fixtures de contrato', () => {
  test('preparar un pago: cotiza, muestra el desglose y envía el pago con la cotización', async ({ page }) => {
    let createdBody: Record<string, unknown> | null = null;
    await useContractFixtures(page, {
      ...base,
      'POST /api/quotations': respond(201, fixtureQuotation()),
      'POST /api/payouts': (request) => {
        createdBody = request.postDataJSON();
        return respond(201, fixturePayout());
      },
      'GET /api/payouts/p-fixture-1': fixturePayout(),
      'GET /api/quotations/q-fixture-1': fixtureQuotation(),
    });
    await signIn(page, 'admin@juriscop.test', '/pagos/nuevo');
    await expect(page.getByRole('heading', { name: 'Nuevo pago', level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Cotizar' }).click();
    await expect(page.getByText('Elige la cuenta de origen.')).toBeVisible();

    await page.getByLabel('Cuenta de origen').selectOption(fixtureAccount.id);
    await page.getByLabel('Destinatario', { exact: true }).selectOption(fixtureRecipient.id);
    await expect(page.getByRole('group', { name: 'Velocidad' })).toBeVisible();
    await page.getByLabel('Importe que recibe el destinatario').fill('1000');
    await page.getByRole('button', { name: 'Cotizar' }).click();

    await expect(page.getByRole('heading', { name: 'Revisa antes de preparar el pago' })).toBeVisible();
    await expect(page.getByRole('timer')).toContainText('Precio vigente');
    await expect(page.getByText('1.030,00 USD')).toBeVisible();
    await page.screenshot({ path: 'test-results/visual/quote-review.png', fullPage: true });
    await expectNoAxeViolations(page);

    await page.getByRole('button', { name: 'Preparar pago' }).click();
    await expect(page).toHaveURL(/\/pagos\/p-fixture-1$/);
    expect(createdBody).toEqual({
      virtualAccountId: fixtureAccount.id,
      recipientId: fixtureRecipient.id,
      amount: 1000,
      currency: 'USD',
      quotationId: 'q-fixture-1',
    });
    await expect(page.getByText('Pago preparado.')).toBeVisible();
    await expect(page.getByText('Lo preparaste tú')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Revisar y aprobar' })).toHaveCount(0);
  });

  test('una cotización vencida no se puede usar: solo se ofrece recotizar', async ({ page }) => {
    await useContractFixtures(page, {
      ...base,
      'POST /api/quotations': respond(201, fixtureQuotation({ secondsToExpiry: 0, status: 'EXPIRED' })),
    });
    await signIn(page, 'admin@juriscop.test', '/pagos/nuevo');
    await page.getByLabel('Cuenta de origen').selectOption(fixtureAccount.id);
    await page.getByLabel('Destinatario', { exact: true }).selectOption(fixtureRecipient.id);
    await page.getByLabel('Importe que recibe el destinatario').fill('1000');
    await page.getByRole('button', { name: 'Cotizar' }).click();
    await expect(page.getByText('Cotización vencida')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preparar pago' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Recotizar' })).toBeEnabled();
  });

  test('aprobar un pago de otra persona envía naturaleza y memo, y muestra el estado del proveedor', async ({
    page,
  }) => {
    let approveBody: Record<string, unknown> | null = null;
    const submitted = fixturePayout({
      approvalState: 'SUBMITTED',
      status: 'PROCESSING',
      approverUserId: 'juriscop:treasury_approver',
      kiraPayoutId: 'kpo_fixture',
    });
    await useContractFixtures(page, {
      ...base,
      'GET /api/payouts/p-fixture-1': fixturePayout(),
      'GET /api/quotations/q-fixture-1': fixtureQuotation(),
      'POST /api/payouts/p-fixture-1/approve': (request) => {
        approveBody = request.postDataJSON();
        return submitted;
      },
      'GET /api/payouts/p-fixture-1/events': [
        { eventId: 'e1', status: 'PROCESSING', message: 'Enviado al banco', createdAt: '2026-09-14T17:05:00Z' },
      ],
    });
    await signIn(page, 'treasury.approver@juriscop.test', '/pagos/p-fixture-1');
    await page.getByRole('button', { name: 'Revisar y aprobar' }).click();
    const drawer = page.getByRole('dialog', { name: 'Aprobar y enviar el pago' });
    await expect(drawer).toBeVisible();
    await drawer.getByLabel('Naturaleza del pago').selectOption('vendor');
    await drawer.getByLabel('Memo para el banco').fill('Factura 2026-041');
    await page.screenshot({ path: 'test-results/visual/approve-drawer.png' });
    await expectNoAxeViolations(page);
    await drawer.getByRole('button', { name: 'Aprobar y enviar' }).click();
    await expect(drawer).toBeHidden();
    expect(approveBody).toEqual({ natureOfPayment: 'vendor', memo: 'Factura 2026-041' });
    await expect(page.getByText('Enviado al proveedor')).toBeVisible();
    await expect(page.getByText('En proceso')).toBeVisible();
    await expect(page.getByText('Enviado al banco')).toBeVisible();
  });

  test('rechazar exige motivo y lo envía', async ({ page }) => {
    let rejectBody: Record<string, unknown> | null = null;
    await useContractFixtures(page, {
      ...base,
      'GET /api/payouts/p-fixture-1': fixturePayout(),
      'GET /api/quotations/q-fixture-1': fixtureQuotation(),
      'POST /api/payouts/p-fixture-1/reject': (request) => {
        rejectBody = request.postDataJSON();
        return fixturePayout({ approvalState: 'REJECTED', approverUserId: 'juriscop:treasury_approver' });
      },
    });
    await signIn(page, 'treasury.approver@juriscop.test', '/pagos/p-fixture-1');
    await page.getByRole('button', { name: 'Rechazar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Rechazar el pago' });
    await expect(dialog.getByRole('button', { name: 'Rechazar pago' })).toBeDisabled();
    await dialog.getByLabel('Motivo').fill('El importe no coincide con la factura');
    await dialog.getByRole('button', { name: 'Rechazar pago' }).click();
    await expect(dialog).toBeHidden();
    expect(rejectBody).toEqual({ reason: 'El importe no coincide con la factura' });
    await expect(page.getByText('Rechazado', { exact: true })).toBeVisible();
  });

  test('la cuenta operativa muestra saldo e instrucciones para recibir fondos', async ({ page }) => {
    await useContractFixtures(page, {
      ...base,
      'GET /api/virtual-accounts/va-fixture-1': fixtureAccount,
      'GET /api/virtual-accounts/va-fixture-1/deposits': [
        {
          id: 'dep-fixture-1',
          virtualAccountId: 'va-fixture-1',
          grossAmount: 5000,
          feeAmount: 10,
          netAmount: 4990,
          currency: 'USD',
          senderName: 'Cliente Fixture Inc',
          senderAccount: '****2222',
          rail: 'WIRE',
          status: 'COMPLETED',
          microdeposit: false,
          creditsBalance: true,
          held: false,
          createdAt: '2026-09-10T12:00:00Z',
        },
      ],
    });
    await signIn(page, 'admin@juriscop.test', '/cuentas/va-fixture-1');
    await expect(page.getByText('Operativa')).toBeVisible();
    await expect(page.getByText('25.000,00 USD')).toBeVisible();
    await expect(page.getByText('900000001234')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copiar routing number' })).toBeVisible();
    await expect(page.getByText('Cliente Fixture Inc').first()).toBeVisible();
    await expect(page.getByText('•••• 2222').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/visual/account-detail.png', fullPage: true });
    await expectNoAxeViolations(page);
  });

  test('registrar destinatario valida por riel y no ofrece redes inválidas para el token', async ({ page }) => {
    const writes = await useContractFixtures(page, base);
    await signIn(page, 'admin@juriscop.test', '/destinatarios/nuevo');
    await page.getByRole('radio', { name: /^ACH/ }).check();
    await page.getByRole('button', { name: 'Registrar destinatario' }).click();
    await expect(page.getByText('Escribe la razón social.')).toBeVisible();
    await expect(page.getByText('Escribe el routing number.')).toBeVisible();
    await expect(page.getByText('Indica al menos calle, ciudad o código postal.')).toBeVisible();
    await page.getByLabel('Routing number').fill('12345678');
    await expect(page.getByText('Debe tener exactamente 9 dígitos.')).toBeVisible();
    await page.screenshot({ path: 'test-results/visual/recipient-errors.png', fullPage: true });

    await page.getByRole('radio', { name: /^Wallet/ }).check();
    await page.getByLabel('Token').selectOption('USDC');
    await expect(page.getByLabel('Red').locator('option')).toHaveText(['Selecciona', 'polygon', 'solana']);
    await expectNoAxeViolations(page);
    expect(writes).toHaveLength(0);
  });

  test('responder una solicitud envía el lote y pinta los rechazos por ítem', async ({ page }) => {
    let answerBody: Record<string, unknown> | null = null;
    await useContractFixtures(page, {
      ...base,
      'GET /api/rfis/rfi-fixture-1': fixtureRfi,
      'PATCH /api/rfis/rfi-fixture-1/items': (request) => {
        answerBody = request.postDataJSON();
        return respond(422, {
          code: 'rfi_answer_rejected',
          message: 'Kira rechazo las respuestas; no se guardo ninguna.',
          details: { 'i-ein': 'Invalid EIN format' },
        });
      },
    });
    await signIn(page, 'admin@juriscop.test', '/solicitudes/rfi-fixture-1');
    await expect(page.getByText('Te toca responder')).toBeVisible();
    await expect(page.getByText('Detiene un pago')).toBeVisible();
    await page.getByRole('textbox', { name: 'EIN de la empresa' }).fill('123');
    await page
      .getByRole('radiogroup', { name: '¿Algún socio es persona expuesta políticamente?' })
      .getByLabel('No')
      .check();
    await page.getByRole('combobox', { name: 'Tipo de identificación del firmante' }).selectOption('itin');
    await page.screenshot({ path: 'test-results/visual/rfi-form.png', fullPage: true });
    await expectNoAxeViolations(page);
    await page.getByRole('button', { name: 'Enviar respuestas' }).click();
    expect(answerBody).toEqual({
      items: [
        { itemId: 'i-ein', answerValue: '123' },
        { itemId: 'i-pep', answerValue: false },
        { itemId: 'i-type', answerValue: 'itin' },
      ],
    });
    await expect(page.getByText('No se guardó ninguna respuesta')).toBeVisible();
    await expect(page.getByText('Invalid EIN format')).toBeVisible();
  });

  test('un rol que solo aprueba pagos ve la solicitud sin controles de respuesta', async ({ page }) => {
    await useContractFixtures(page, { ...base, 'GET /api/rfis/rfi-fixture-1': fixtureRfi });
    await signIn(page, 'treasury.approver@juriscop.test', '/solicitudes/rfi-fixture-1');
    await expect(page.getByText('Responde una persona con rol de Administración.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar respuestas' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'EIN de la empresa' })).toBeDisabled();
  });
});
