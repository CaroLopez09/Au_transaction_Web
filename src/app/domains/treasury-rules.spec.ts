import { accountReadiness, VirtualAccount } from './accounts/domain/virtual-account';
import { toVirtualAccount } from './accounts/infrastructure/virtual-account.mapper';
import { toDeposit } from './deposits/infrastructure/deposit.mapper';
import { homeAttention } from './home/home-attention';
import { approvalBlocker, Payout } from './payouts/domain/payout';
import { isRedeemable, railsForRecipient, secondsLeft } from './payouts/domain/quotation';
import { toApprovePayoutDto, toPayout, toQuotation } from './payouts/infrastructure/payouts.mapper';
import { isBlankAddress, networksFor, ROUTING_NUMBER_PATTERN, SWIFT_PATTERN } from './recipients/domain/recipient';
import { toRegisterRecipientDto } from './recipients/infrastructure/recipient.mapper';
import { answersWithValue, fileProblem, maxFilesFor } from './rfis/domain/rfi';
import { toItem, toRfi } from './rfis/infrastructure/rfi.mapper';

const fixtureAccountDto = {
  id: 'va-fixture',
  status: 'ACTIVE',
  mode: 'FIAT',
  balanceStale: true,
  fundsReady: false,
  activationDelayed: false,
};

describe('cuentas virtuales', () => {
  const account = (overrides: object): VirtualAccount => toVirtualAccount({ ...fixtureAccountDto, ...overrides });

  it('ACTIVE no basta: manda fundsReady', () => {
    expect(accountReadiness(account({ kiraAccountId: 'kva' }))).toBe('activating');
    expect(accountReadiness(account({ kiraAccountId: 'kva', fundsReady: true }))).toBe('operational');
  });

  it('distingue apertura sin confirmar, demora, desactivada y fallida', () => {
    expect(accountReadiness(account({}))).toBe('not-confirmed');
    expect(accountReadiness(account({ kiraAccountId: 'kva', activationDelayed: true }))).toBe('delayed');
    expect(accountReadiness(account({ kiraAccountId: 'kva', status: 'INACTIVE' }))).toBe('inactive');
    expect(accountReadiness(account({ status: 'FAILED' }))).toBe('failed');
  });

  it('tolera estados y modos desconocidos y campos ausentes', () => {
    const mapped = account({ status: 'weird', mode: 'other' });
    expect(mapped.status).toBe('UNKNOWN');
    expect(mapped.mode).toBe('UNKNOWN');
    expect(mapped.availableBalance).toBeNull();
    expect(mapped.createdAt).toBeNull();
  });
});

describe('depósitos', () => {
  it('normaliza estado y riel, y conserva los tres importes por separado', () => {
    const deposit = toDeposit({
      id: 'dep-fixture',
      virtualAccountId: 'va-fixture',
      grossAmount: 100,
      feeAmount: 1.5,
      netAmount: 98.5,
      currency: 'USD',
      rail: 'wire',
      status: 'refunded',
      microdeposit: false,
      creditsBalance: false,
      held: false,
    });
    expect(deposit).toMatchObject({ rail: 'WIRE', status: 'REFUNDED', grossAmount: 100, netAmount: 98.5 });
    expect(toDeposit({ ...deposit, id: 'y', status: 'kyt_rejected', held: true } as never)).toMatchObject({
      status: 'KYT_REJECTED',
      held: true,
    });
    expect(
      toDeposit({ ...deposit, id: 'x', status: 'kyt', microdeposit: false, creditsBalance: false } as never).status,
    ).toBe('UNKNOWN');
  });
});

describe('destinatarios', () => {
  it('valida routing (9 dígitos) y SWIFT (8 u 11) como el BFF', () => {
    expect(ROUTING_NUMBER_PATTERN.test('021000021')).toBe(true);
    expect(ROUTING_NUMBER_PATTERN.test('02100002')).toBe(false);
    expect(SWIFT_PATTERN.test('BOFAUS3N')).toBe(true);
    expect(SWIFT_PATTERN.test('BOFAUS3NXXX')).toBe(true);
    expect(SWIFT_PATTERN.test('BOFAUS3')).toBe(false);
  });

  it('USDC no existe en tron', () => {
    expect(networksFor('USDC')).not.toContain('tron');
    expect(networksFor('USDT')).toContain('tron');
    expect(networksFor(null)).toEqual([]);
  });

  it('una dirección sin calle, ciudad ni código postal es vacía', () => {
    expect(isBlankAddress({ streetName: ' ', city: null, state: 'FL', postalCode: '', country: 'US' })).toBe(true);
    expect(isBlankAddress({ streetName: null, city: 'Miami', state: null, postalCode: null, country: 'US' })).toBe(
      false,
    );
  });

  it('solo envía los campos del riel elegido', () => {
    const address = { streetName: '1 Main St', city: 'Miami', state: 'FL', postalCode: '33101', country: 'us' };
    const ach = toRegisterRecipientDto({
      holder: {
        business: true,
        companyName: 'Proveedor SA',
        firstName: 'Ignorado',
        lastName: null,
        email: null,
        phone: null,
      },
      destination: {
        rail: 'ACH',
        routingNumber: '021000021',
        accountNumber: '123456789',
        accountKind: 'checking',
        bankName: null,
        swiftCode: 'IGNORADO',
        bankAddressText: 'Banco, Miami',
        bankAddress: null,
        address,
      },
      docType: null,
      docNumber: null,
    });
    expect(ach).toMatchObject({
      rail: 'ACH',
      business: true,
      companyName: 'Proveedor SA',
      bankAddressText: 'Banco, Miami',
    });
    expect(ach.address?.country).toBe('US');
    expect('firstName' in ach).toBe(false);
    expect('swiftCode' in ach).toBe(false);
    expect('token' in ach).toBe(false);

    const wallet = toRegisterRecipientDto({
      holder: { business: false, companyName: null, firstName: 'Ana', lastName: 'Ruiz', email: null, phone: null },
      destination: { rail: 'WALLET', token: 'USDC', network: 'solana', walletAddress: ' addr ', address: null },
      docType: null,
      docNumber: null,
    });
    expect(wallet).toEqual({
      rail: 'WALLET',
      business: false,
      firstName: 'Ana',
      lastName: 'Ruiz',
      token: 'USDC',
      network: 'solana',
      walletAddress: 'addr',
    });
  });
});

describe('cotizaciones y pagos', () => {
  const quote = (overrides: object = {}, now = 1_000_000) =>
    toQuotation(
      {
        id: 'q-fixture',
        virtualAccountId: 'va',
        recipientId: 'r',
        rail: 'ACH_STANDARD',
        balanceSufficient: true,
        fallbackRate: false,
        status: 'ACTIVE',
        secondsToExpiry: 900,
        ...overrides,
      },
      now,
    );

  it('ancla el vencimiento a secondsToExpiry recibido, no al reloj del servidor', () => {
    const quotation = quote({}, 1_000_000);
    expect(secondsLeft(quotation, 1_000_000)).toBe(900);
    expect(secondsLeft(quotation, 1_000_000 + 899_500)).toBe(0);
    expect(secondsLeft(quotation, 1_000_000 + 2_000_000)).toBe(0);
  });

  it('solo es redimible activa, vigente y con saldo', () => {
    expect(isRedeemable(quote(), 1_000_000)).toBe(true);
    expect(isRedeemable(quote({ balanceSufficient: false }), 1_000_000)).toBe(false);
    expect(isRedeemable(quote({ status: 'EXECUTED' }), 1_000_000)).toBe(false);
    expect(isRedeemable(quote({ secondsToExpiry: 0 }), 1_000_000)).toBe(false);
  });

  it('el riel se deriva del destinatario', () => {
    expect(railsForRecipient('ACH', null)).toEqual(['ACH_STANDARD', 'ACH_SAME_DAY']);
    expect(railsForRecipient('WIRE', null)).toEqual(['WIRE_DOMESTIC']);
    expect(railsForRecipient('WALLET', 'solana')).toEqual(['SOLANA']);
    expect(railsForRecipient('WALLET', null)).toEqual([]);
  });

  const payout = (overrides: object = {}): Payout =>
    toPayout({
      id: 'p-fixture',
      virtualAccountId: 'va',
      recipientId: 'r',
      approvalState: 'PENDING_APPROVAL',
      status: 'NOT_SUBMITTED',
      terminal: false,
      makerUserId: 'org:treasury_maker',
      priceLocked: true,
      ...overrides,
    });

  it('quien prepara no aprueba (Payout.approve)', () => {
    expect(approvalBlocker(payout(), 'org:treasury_maker')).toBe('own-payout');
    expect(approvalBlocker(payout(), 'org:treasury_approver')).toBeNull();
    expect(approvalBlocker(payout({ approvalState: 'SUBMITTED' }), 'org:treasury_approver')).toBe('not-pending');
  });

  it('el cuerpo de aprobación omite lo vacío y envía documentos como data URI', () => {
    expect(toApprovePayoutDto({ comment: ' ', natureOfPayment: null, memo: null, documents: [] })).toEqual({});
    expect(
      toApprovePayoutDto({
        comment: null,
        natureOfPayment: 'vendor',
        memo: 'INV-1',
        documents: [{ type: 'invoice', fileName: 'f.pdf', dataUri: 'data:application/pdf;base64,AA==' }],
      }),
    ).toEqual({
      natureOfPayment: 'vendor',
      memo: 'INV-1',
      documents: [{ type: 'invoice', file: 'data:application/pdf;base64,AA==' }],
    });
  });
});

describe('solicitudes de información', () => {
  it('lee ítems crudos del proveedor con los nombres documentados y descarta los que no tienen item_id', () => {
    const item = toItem({
      item_id: 'i-choice',
      prompt: '¿Tipo de identificación?',
      answer_type: 'choice',
      answer_spec: { options: ['ssn', 'itin', 3] },
      status: 'pending',
      documents: [{ document_id: 'd1', file_name: 'a.pdf' }, { id: 'd2', name: 'b.pdf' }, { nada: true }],
    });
    expect(item).toMatchObject({ id: 'i-choice', answerType: 'choice', status: 'pending' });
    expect(item?.spec.options).toEqual(['ssn', 'itin']);
    expect(item?.documents.map((doc) => doc.fileName)).toEqual(['a.pdf', 'b.pdf']);
    expect(toItem({ prompt: 'sin id' })).toBeNull();
    expect(toItem({ item_id: 'x', answer_type: 'nuevo_tipo' })?.answerType).toBe('unknown');
  });

  it('normaliza not_resolved y el bloqueo', () => {
    const rfi = toRfi({
      id: 'rfi-fixture',
      status: 'NOT-RESOLVED',
      open: false,
      overdue: false,
      totalItems: 0,
      pendingItems: 0,
      blocking: { type: 'transfer', payoutId: 'p1' },
    });
    expect(rfi.status).toBe('NOT_RESOLVED');
    expect(rfi.blocking).toMatchObject({ type: 'transfer', payoutId: 'p1', depositId: null });
  });

  it('valida archivos con el answer_spec o los límites por defecto del BFF', () => {
    const documentItem = toItem({
      item_id: 'd',
      answer_type: 'document',
      answer_spec: { max_files: 50, mime_types: ['application/pdf'] },
    })!;
    expect(maxFilesFor(documentItem)).toBe(20);
    expect(fileProblem(documentItem, { name: 'a.png', type: 'image/png', size: 10 })).toContain('tipo no admitido');
    expect(fileProblem(documentItem, { name: 'a.pdf', type: 'application/pdf', size: 31 * 1024 * 1024 })).toContain(
      '30 MB',
    );
    expect(fileProblem(documentItem, { name: 'a.pdf', type: 'application/pdf', size: 0 })).toContain('vacío');
    const anyItem = toItem({ item_id: 'e', answer_type: 'document' })!;
    expect(fileProblem(anyItem, { name: 'a.heic', type: 'image/heic', size: 10 })).toBeNull();
    expect(answersWithValue(documentItem)).toBe(false);
    expect(answersWithValue(toItem({ item_id: 'b', answer_type: 'boolean' })!)).toBe(true);
  });
});

describe('Inicio: una sola señal de atención', () => {
  const onboarding = {
    label: 'Sin iniciar',
    tone: 'attention' as const,
    headline: 'h',
    explanation: 'e',
    awaitsOrganization: true,
  };

  it('prioriza solicitudes abiertas, luego pagos por aprobar, luego vinculación', () => {
    expect(homeAttention({ openRfis: 1, overdueRfis: 1, approvablePayouts: 3, onboarding }).key).toBe('rfis');
    expect(homeAttention({ openRfis: 1, overdueRfis: 1, approvablePayouts: 3, onboarding }).tone).toBe('critical');
    expect(homeAttention({ openRfis: 0, overdueRfis: 0, approvablePayouts: 2, onboarding }).headline).toBe(
      '2 pagos esperan tu aprobación',
    );
    expect(homeAttention({ openRfis: 0, overdueRfis: 0, approvablePayouts: 0, onboarding }).key).toBe('onboarding');
  });
});
