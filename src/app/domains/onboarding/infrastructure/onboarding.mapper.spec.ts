import { OnboardingViewDto, UboRosterDto } from './onboarding.dto';
import { termsPending } from '../domain/onboarding.repository';
import { toDocumentsForm } from './onboarding-http.repository';
import { toOnboardingStatus, toOwnershipRoster, toProviderTerms, toSaveUboDto } from './onboarding.mapper';

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
          firstName: 'Persona',
          lastName: 'Fixture',
          knownToKira: false,
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
    expect(owner.birthDate).toBeNull();
    expect(owner.address).toBeNull();
    expect(owner.knownToProvider).toBe(false);
    expect(owner.liveness.status).toBe('PENDING');
    expect(owner.liveness.expiresAt?.toISOString()).toBe('2026-09-21T10:00:00.000Z');
    expect(toOwnershipRoster(fixture).totalOwnership).toBe(0);
  });
});

describe('toSaveUboDto', () => {
  const base = {
    id: null,
    firstName: ' María ',
    lastName: 'Pérez',
    roleInCompany: '',
    email: null,
    documentType: '  ',
    documentNumber: null,
    hasOwnership: true,
    ownershipPercentage: 60,
    hasControl: true,
    isSigner: false,
    politicallyExposed: false,
    countryOfBirth: ' col ',
    birthDate: null,
    nationality: null,
    occupation: null,
    gender: null,
    phoneNumber: null,
    documentCountry: null,
    address: null,
  } as const;

  it('en un alta envía nombre y apellido, y omite opcionales vacíos', () => {
    expect(toSaveUboDto(base)).toEqual({
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

  it('en una edición envía el id y los nombres corregidos', () => {
    const dto = toSaveUboDto({ ...base, id: 'ubo-1', firstName: 'Ana', roleInCompany: 'Gerente' });
    expect(dto.id).toBe('ubo-1');
    expect(dto.firstName).toBe('Ana');
    expect(dto.roleInCompany).toBe('Gerente');
  });

  it('envía los datos de identidad que pide el proveedor en ISO-3 y sin campos vacíos de dirección', () => {
    const dto = toSaveUboDto({
      ...base,
      birthDate: '1985-04-12',
      nationality: 'col',
      gender: 'female',
      phoneNumber: '+573001234567',
      documentCountry: 'col',
      address: { streetName: 'Calle 1', city: 'Bogotá', state: null, postalCode: ' ', country: 'col' },
    });
    expect(dto.birthDate).toBe('1985-04-12');
    expect(dto.nationality).toBe('COL');
    expect(dto.gender).toBe('female');
    expect(dto.documentCountry).toBe('COL');
    expect(dto.address).toEqual({ streetName: 'Calle 1', city: 'Bogotá', country: 'COL' });
  });
});

describe('términos y consentimiento biométrico', () => {
  it('pide aceptar solo cuando hay una versión vigente distinta de la aceptada', () => {
    expect(termsPending(toProviderTerms({ version: null, url: null, acceptedVersion: null }))).toBe(false);
    expect(termsPending(toProviderTerms({ version: '2026-09', url: null, acceptedVersion: null }))).toBe(true);
    expect(termsPending(toProviderTerms({ version: '2026-09', url: null, acceptedVersion: '2026-01' }))).toBe(true);
    expect(termsPending(toProviderTerms({ version: '2026-09', url: null, acceptedVersion: '2026-09' }))).toBe(false);
    expect(termsPending(null)).toBe(false);
  });

  it('el multipart declara el consentimiento solo si se dio', () => {
    const file = new File(['x'], 'selfie.png', { type: 'image/png' });
    const base = { informationType: 'passport', issuingCountry: 'col', number: null, expiration: null };
    const conSelfie = toDocumentsForm({ ...base, files: [{ role: 'selfie', file }], biometricConsent: true });
    const sinConsentimiento = toDocumentsForm({ ...base, files: [{ role: 'front', file }] });
    expect(conSelfie.get('biometricConsent')).toBe('true');
    expect(sinConsentimiento.has('biometricConsent')).toBe(false);
  });
});
