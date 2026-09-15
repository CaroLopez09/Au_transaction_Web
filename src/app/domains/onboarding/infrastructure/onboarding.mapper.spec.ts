import { OnboardingViewDto, UboRosterDto } from './onboarding.dto';
import { nameFieldsForUpdate, toOnboardingStatus, toOwnershipRoster, toSaveUboDto } from './onboarding.mapper';

/** Respuesta real de GET /api/onboarding (organización semilla, 14-sep-2026): sin kiraUserId por non_null. */
const fixtureUnregisteredOnboarding: OnboardingViewDto = {
  tenantId: 'juriscop',
  name: 'Juriscop',
  status: 'CREATED',
  verificationTriggered: false,
  pendingFields: [],
  eligibleProducts: [],
  readyForVirtualAccounts: false,
  enhancedDueDiligenceRequired: false,
};

describe('toOnboardingStatus', () => {
  it('trata la ausencia de kiraUserId como empresa no dada de alta', () => {
    const status = toOnboardingStatus(fixtureUnregisteredOnboarding);
    expect(status.providerUserId).toBeNull();
    expect(status.companyName).toBe('Juriscop');
    expect(status.status).toBe('CREATED');
  });

  it('tolera listas ausentes y estados desconocidos sin romper', () => {
    const status = toOnboardingStatus({
      tenantId: 't',
      name: 'T',
      status: 'active',
      verificationTriggered: true,
      readyForVirtualAccounts: false,
      enhancedDueDiligenceRequired: false,
    });
    expect(status.status).toBe('UNKNOWN');
    expect(status.rawStatus).toBe('active');
    expect(status.pendingFields).toEqual([]);
    expect(status.eligibleProducts).toEqual([]);
  });

  it('normaliza el estado sin distinguir mayúsculas', () => {
    expect(toOnboardingStatus({ ...fixtureUnregisteredOnboarding, status: 'verified' }).status).toBe('VERIFIED');
  });

  it('conserva los productos con sus faltantes y motivo', () => {
    const status = toOnboardingStatus({
      ...fixtureUnregisteredOnboarding,
      kiraUserId: 'usr_fixture',
      eligibleProducts: [{ productCode: 'usa-virtual-accounts', eligible: false, missingFields: ['x'] }],
    });
    expect(status.eligibleProducts[0]).toEqual({
      productCode: 'usa-virtual-accounts',
      eligible: false,
      missingFields: ['x'],
      unsupportedReason: null,
    });
  });
});

describe('toOwnershipRoster', () => {
  it('mapea el roster vacío real', () => {
    const roster = toOwnershipRoster({
      members: [],
      totalOwnership: 0,
      hasBeneficialOwner: false,
      livenessComplete: false,
    });
    expect(roster.members).toEqual([]);
    expect(roster.totalOwnership).toBe(0);
  });

  it('convierte fechas y opcionales ausentes de un beneficiario', () => {
    const fixture: UboRosterDto = {
      hasBeneficialOwner: true,
      livenessComplete: false,
      members: [
        {
          id: 'ubo-fixture',
          fullName: 'Persona Fixture',
          hasOwnership: true,
          ownershipPercentage: 51.5,
          beneficialOwner: true,
          hasControl: false,
          signer: true,
          politicallyExposed: false,
          countryOfBirth: 'COL',
          livenessStatus: 'pending',
          livenessExpiresAt: '2026-09-21T10:00:00Z',
        },
      ],
    };
    const [owner] = toOwnershipRoster(fixture).members;
    expect(owner.documentNumber).toBeNull();
    expect(owner.liveness.status).toBe('PENDING');
    expect(owner.liveness.expiresAt?.toISOString()).toBe('2026-09-21T10:00:00.000Z');
    expect(toOwnershipRoster(fixture).totalOwnership).toBe(0);
  });
});

describe('toSaveUboDto', () => {
  const role = {
    email: null,
    documentType: '  ',
    documentNumber: null,
    hasOwnership: true,
    ownershipPercentage: 60,
    hasControl: true,
    isSigner: false,
    politicallyExposed: false,
    countryOfBirth: ' col ',
  };

  it('en un alta envía nombre, apellido y cargo, y omite opcionales vacíos', () => {
    expect(
      toSaveUboDto({ kind: 'register', firstName: ' María ', lastName: 'Pérez', roleInCompany: '', ...role }),
    ).toEqual({
      firstName: 'María',
      lastName: 'Pérez',
      hasOwnership: true,
      ownershipPercentage: 60,
      hasControl: true,
      isSigner: false,
      politicallyExposed: false,
      countryOfBirth: 'COL',
    });
  });

  it('en una edición envía el id, no envía cargo y reparte el nombre vigente para la validación del BFF', () => {
    const dto = toSaveUboDto({ kind: 'update', id: 'ubo-1', fullName: 'María José Pérez', ...role });
    expect(dto.id).toBe('ubo-1');
    expect(dto.firstName).toBe('María');
    expect(dto.lastName).toBe('José Pérez');
    expect('roleInCompany' in dto).toBe(false);
  });

  it('un nombre de una sola palabra sigue superando la validación', () => {
    expect(nameFieldsForUpdate('Madonna')).toEqual({ firstName: 'Madonna', lastName: 'Madonna' });
  });
});
