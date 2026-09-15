import { maskDocument, OwnershipRoster, qualifiesAsBeneficialOwner, rosterWarnings } from './beneficial-owner';
import { onboardingSteps } from './onboarding-progress';
import { canRefreshFromProvider, OnboardingStatus, onboardingStage } from './onboarding-status';

const fixtureStatus = (overrides: Partial<OnboardingStatus> = {}): OnboardingStatus => ({
  tenantId: 'fixture',
  companyName: 'Fixture S.A.S.',
  providerUserId: null,
  status: 'CREATED',
  rawStatus: 'CREATED',
  rejectionReason: null,
  verificationTriggered: false,
  pendingFields: [],
  eligibleProducts: [],
  readyForVirtualAccounts: false,
  enhancedDueDiligenceRequired: false,
  ...overrides,
});

const fixtureRoster = (livenessComplete: boolean): OwnershipRoster => ({
  members: [],
  totalOwnership: 0,
  hasBeneficialOwner: false,
  livenessComplete,
});

describe('onboardingStage', () => {
  it.each([
    [{}, 'not-started'],
    [{ providerUserId: 'usr' }, 'information-pending'],
    [{ providerUserId: 'usr', status: 'VERIFYING' as const }, 'verifying'],
    [{ providerUserId: 'usr', status: 'REVIEW' as const }, 'in-review'],
    [{ providerUserId: 'usr', status: 'VERIFIED' as const }, 'product-pending'],
    [{ providerUserId: 'usr', status: 'VERIFIED' as const, readyForVirtualAccounts: true }, 'ready'],
    [{ providerUserId: 'usr', status: 'REJECTED' as const }, 'rejected'],
    [{ providerUserId: 'usr', status: 'UNKNOWN' as const }, 'unknown'],
  ])('%o → %s', (overrides, expected) => {
    expect(onboardingStage(fixtureStatus(overrides))).toBe(expected);
  });

  it('no permite consultar al proveedor una empresa sin alta (el BFF respondería 422)', () => {
    expect(canRefreshFromProvider(fixtureStatus())).toBe(false);
    expect(canRefreshFromProvider(fixtureStatus({ providerUserId: 'usr' }))).toBe(true);
  });
});

describe('onboardingSteps', () => {
  const states = (status: OnboardingStatus, roster: OwnershipRoster | null = null) =>
    onboardingSteps(status, roster).map((step) => step.state);

  it('marca el alta como paso actual cuando no ha comenzado', () => {
    expect(states(fixtureStatus())).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('avanza al perfil tras el alta y a la prueba de vida cuando la verificación se disparó', () => {
    expect(states(fixtureStatus({ providerUserId: 'usr' }))).toEqual([
      'done',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    expect(states(fixtureStatus({ providerUserId: 'usr', verificationTriggered: true }), fixtureRoster(false))).toEqual(
      ['done', 'done', 'current', 'upcoming', 'upcoming'],
    );
  });

  it('completa todo cuando la empresa está lista', () => {
    const ready = fixtureStatus({ providerUserId: 'usr', status: 'VERIFIED', readyForVirtualAccounts: true });
    expect(states(ready, fixtureRoster(true))).toEqual(['done', 'done', 'done', 'done', 'done']);
  });

  it('detiene la verificación si fue rechazada, sin inventar un paso actual', () => {
    const rejected = fixtureStatus({ providerUserId: 'usr', status: 'REJECTED' });
    expect(states(rejected, fixtureRoster(true))).toEqual(['done', 'done', 'done', 'blocked', 'upcoming']);
  });
});

describe('maskDocument', () => {
  it('oculta todo salvo los últimos cuatro caracteres', () => {
    expect(maskDocument('1020304050')).toBe('•••• 4050');
    expect(maskDocument('123')).toBe('123');
    expect(maskDocument(null)).toBeNull();
  });
});

describe('beneficiario final y avisos del grupo (reglas de Ubo y UboRoster del BFF)', () => {
  it('exige participación declarada y al menos 5 %', () => {
    expect(qualifiesAsBeneficialOwner(true, 5)).toBe(true);
    expect(qualifiesAsBeneficialOwner(true, 4.99)).toBe(false);
    expect(qualifiesAsBeneficialOwner(false, 60)).toBe(false);
    expect(qualifiesAsBeneficialOwner(true, null)).toBe(false);
  });

  const roster = (overrides: Partial<OwnershipRoster>): OwnershipRoster => ({
    members: [],
    totalOwnership: 0,
    hasBeneficialOwner: false,
    livenessComplete: false,
    ...overrides,
  });
  const member = {} as OwnershipRoster['members'][number];

  it('no avisa sobre un grupo vacío (ya lo explica el estado vacío)', () => {
    expect(rosterWarnings(roster({}))).toEqual([]);
  });

  it('avisa si nadie es beneficiario final o si la suma supera 100 %', () => {
    expect(rosterWarnings(roster({ members: [member], totalOwnership: 3 }))).toEqual(['no-beneficial-owner']);
    expect(rosterWarnings(roster({ members: [member], totalOwnership: 120, hasBeneficialOwner: true }))).toEqual([
      'ownership-over-100',
    ]);
    expect(rosterWarnings(roster({ members: [member], totalOwnership: 100, hasBeneficialOwner: true }))).toEqual([]);
  });
});
