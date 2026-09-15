import { Page, Request, Route } from '@playwright/test';

/**
 * FIXTURES DE PRUEBA — nunca se usan en producción.
 * Respuestas con la forma exacta de las vistas del BFF (docs/frontend-backend-contract.md) para verificar
 * flujos que en local no se pueden recorrer sin credenciales del proveedor. Se interceptan antes de salir
 * del navegador: ninguna escritura llega al BFF ni a la base de datos.
 */
export const fixtureOnboardingVerified = {
  tenantId: 'juriscop',
  name: 'Juriscop',
  kiraUserId: 'usr_fixture',
  status: 'VERIFIED',
  verificationTriggered: true,
  pendingFields: [],
  eligibleProducts: [{ productCode: 'usa-virtual-accounts', eligible: true, missingFields: [] }],
  readyForVirtualAccounts: true,
  enhancedDueDiligenceRequired: false,
};

export const fixtureAccount = {
  id: 'va-fixture-1',
  kiraAccountId: 'kva_fixture_1',
  status: 'ACTIVE',
  mode: 'FIAT',
  bank: 'fixture_bank',
  bankName: 'Banco Fixture',
  description: 'Recaudo EE. UU. (fixture)',
  accountNumber: '900000001234',
  routingNumber: '021000021',
  currency: 'USD',
  availableBalance: 25000,
  balanceRefreshedAt: '2026-09-14T15:00:00Z',
  balanceStale: false,
  fundsReady: true,
  activationDelayed: false,
  createdAt: '2026-09-01T12:00:00Z',
};

export const fixtureRecipient = {
  id: 'rcp-fixture-1',
  kiraRecipientId: 'krcp_fixture_1',
  name: 'Proveedor Fixture LLC',
  rail: 'ACH',
  bankName: 'Banco Destino Fixture',
  maskedDestination: '****6789',
  status: 'ACTIVE',
  registeredInKira: true,
  alreadyExisted: false,
  createdAt: '2026-09-02T12:00:00Z',
};

export function fixtureQuotation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q-fixture-1',
    kiraQuoteId: 'kq_fixture_1',
    virtualAccountId: fixtureAccount.id,
    recipientId: fixtureRecipient.id,
    rail: 'ACH_STANDARD',
    originAmount: 1000,
    destinationAmount: 1000,
    destinationCurrency: 'USD',
    kiraFee: 15,
    platformFee: 15,
    totalFee: 30,
    totalDebitAmount: 1030,
    balanceSufficient: true,
    fallbackRate: false,
    status: 'ACTIVE',
    expiresAt: '2026-09-14T18:15:00Z',
    secondsToExpiry: 900,
    ...overrides,
  };
}

export function fixturePayout(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p-fixture-1',
    virtualAccountId: fixtureAccount.id,
    recipientId: fixtureRecipient.id,
    quotationId: 'q-fixture-1',
    amount: 1000,
    currency: 'USD',
    kiraFee: 15,
    platformFee: 15,
    totalFee: 30,
    totalDebitAmount: 1030,
    approvalState: 'PENDING_APPROVAL',
    status: 'NOT_SUBMITTED',
    terminal: false,
    makerUserId: 'juriscop:treasury_maker',
    priceLocked: true,
    createdAt: '2026-09-14T17:00:00Z',
    ...overrides,
  };
}

export const fixtureRfi = {
  id: 'rfi-fixture-1',
  kiraRfiId: 'krfi_fixture_1',
  status: 'PENDING',
  open: true,
  overdue: false,
  dueDate: '2026-09-28T12:00:00Z',
  totalItems: 4,
  pendingItems: 4,
  items: [
    {
      item_id: 'i-ein',
      prompt: 'EIN de la empresa',
      answer_type: 'identifier',
      answer_spec: { format: 'ein' },
      status: 'pending',
    },
    {
      item_id: 'i-pep',
      prompt: '¿Algún socio es persona expuesta políticamente?',
      answer_type: 'boolean',
      status: 'pending',
    },
    {
      item_id: 'i-type',
      prompt: 'Tipo de identificación del firmante',
      answer_type: 'choice',
      answer_spec: { options: ['ssn', 'itin'] },
      status: 'pending',
    },
    {
      item_id: 'i-doc',
      prompt: 'Estados financieros del último año',
      answer_type: 'document',
      answer_spec: { max_files: 2, mime_types: ['application/pdf'] },
      status: 'pending',
      documents: [],
    },
  ],
  blocking: { type: 'transfer', kiraResourceId: 'kpo_fixture', payoutId: 'p-fixture-1', payoutStatus: 'IN_REVIEW' },
  createdAt: '2026-09-14T12:00:00Z',
};

const RESPONSE = Symbol('fixture-response');

/** Respuesta con código HTTP explícito. Sin envoltorio, el valor es el cuerpo de un 200. */
export function respond(status: number, json: unknown): { [RESPONSE]: true; status: number; json: unknown } {
  return { [RESPONSE]: true, status, json };
}

export type FixtureHandler = (request: Request, route: Route) => unknown | Promise<unknown>;

/**
 * Intercepta /api/** salvo la sesión (login y /me siguen siendo reales).
 * `handlers` se buscan por "MÉTODO /ruta" exacta; lo no declarado responde 404 para que ningún
 * dato real se mezcle con los fixtures.
 */
export async function useContractFixtures(
  page: Page,
  handlers: Record<string, unknown | FixtureHandler>,
): Promise<Request[]> {
  const writes: Request[] = [];
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/auth/')) {
      return route.continue();
    }
    if (request.method() !== 'GET') {
      writes.push(request);
    }
    const key = `${request.method()} ${url.pathname}`;
    if (!(key in handlers)) {
      return route.fulfill({ status: 404, json: { code: 'not_found', message: `Sin fixture para ${key}` } });
    }
    const handler = handlers[key];
    const result = typeof handler === 'function' ? await (handler as FixtureHandler)(request, route) : handler;
    if (typeof result === 'object' && result !== null && RESPONSE in result) {
      const explicit = result as { status: number; json: unknown };
      return route.fulfill({ status: explicit.status, json: explicit.json });
    }
    return route.fulfill({ status: 200, json: result });
  });
  return writes;
}
