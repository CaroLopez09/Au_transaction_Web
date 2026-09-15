import {
  BeneficialOwner,
  Gender,
  OwnershipRoster,
  parseLivenessStatus,
  ResidentialAddress,
  SaveBeneficialOwner,
} from '../domain/beneficial-owner';
import { EligibleProduct, OnboardingStatus, parseKybStatus } from '../domain/onboarding-status';
import {
  EligibleProductDto,
  OnboardingDraftViewDto,
  ResidentialAddressDto,
  OnboardingViewDto,
  SaveUboDto,
  UboRosterDto,
  UboViewDto,
} from './onboarding.dto';
import { normalizeDraft } from '../domain/onboarding-draft';
import { SavedDraft } from '../domain/onboarding.repository';
import { toDate } from '../../../shared/utilities/dates';

export function toOnboardingStatus(dto: OnboardingViewDto): OnboardingStatus {
  return {
    tenantId: dto.tenantId,
    companyName: dto.name,
    providerUserId: dto.kiraUserId ?? null,
    status: parseKybStatus(dto.status),
    rawStatus: dto.status,
    rejectionReason: dto.rejectionReason ?? null,
    verificationTriggered: dto.verificationTriggered,
    pendingFields: dto.pendingFields ?? [],
    eligibleProducts: (dto.eligibleProducts ?? []).map(toEligibleProduct),
    readyForVirtualAccounts: dto.readyForVirtualAccounts,
    enhancedDueDiligenceRequired: dto.enhancedDueDiligenceRequired,
  };
}

function toEligibleProduct(dto: EligibleProductDto): EligibleProduct {
  return {
    productCode: dto.productCode ?? '',
    eligible: dto.eligible,
    missingFields: dto.missingFields ?? [],
    unsupportedReason: dto.unsupportedReason ?? null,
  };
}

export function toOwnershipRoster(dto: UboRosterDto): OwnershipRoster {
  return {
    members: (dto.members ?? []).map(toBeneficialOwner),
    totalOwnership: dto.totalOwnership ?? 0,
    hasBeneficialOwner: dto.hasBeneficialOwner,
    livenessComplete: dto.livenessComplete,
  };
}

export function toBeneficialOwner(dto: UboViewDto): BeneficialOwner {
  return {
    id: dto.id,
    fullName: dto.fullName,
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email ?? null,
    documentType: dto.documentType ?? null,
    documentNumber: dto.documentNumber ?? null,
    hasOwnership: dto.hasOwnership,
    ownershipPercentage: dto.ownershipPercentage ?? null,
    beneficialOwner: dto.beneficialOwner,
    hasControl: dto.hasControl,
    signer: dto.signer,
    politicallyExposed: dto.politicallyExposed,
    countryOfBirth: dto.countryOfBirth ?? null,
    roleInCompany: dto.roleInCompany ?? null,
    birthDate: dto.birthDate ?? null,
    nationality: dto.nationality ?? null,
    occupation: dto.occupation ?? null,
    gender: parseGender(dto.gender),
    phoneNumber: dto.phoneNumber ?? null,
    documentCountry: dto.documentCountry ?? null,
    address: toAddress(dto.address),
    knownToProvider: dto.knownToKira,
    liveness: {
      status: parseLivenessStatus(dto.livenessStatus),
      link: dto.livenessLink ?? null,
      expiresAt: dto.livenessExpiresAt ? new Date(dto.livenessExpiresAt) : null,
    },
  };
}

function parseGender(raw: string | undefined): Gender | null {
  return raw === 'male' || raw === 'female' || raw === 'other' ? raw : null;
}

function toAddress(dto: ResidentialAddressDto | undefined): ResidentialAddress | null {
  if (!dto) {
    return null;
  }
  return {
    streetName: dto.streetName ?? null,
    city: dto.city ?? null,
    state: dto.state ?? null,
    postalCode: dto.postalCode ?? null,
    country: dto.country ?? null,
  };
}

/** Opcionales vacíos no viajan: el BFF distingue "sin dato" de un texto en blanco. */
export function toSaveUboDto(command: SaveBeneficialOwner): SaveUboDto {
  const address = toAddressDto(command.address);
  return {
    ...(command.id ? { id: command.id } : {}),
    firstName: command.firstName.trim(),
    lastName: command.lastName.trim(),
    ...optional('roleInCompany', command.roleInCompany),
    ...optional('email', command.email),
    ...optional('documentType', command.documentType),
    ...optional('documentNumber', command.documentNumber),
    hasOwnership: command.hasOwnership,
    ownershipPercentage: command.ownershipPercentage,
    hasControl: command.hasControl,
    isSigner: command.isSigner,
    politicallyExposed: command.politicallyExposed,
    countryOfBirth: command.countryOfBirth.trim().toUpperCase(),
    ...optional('birthDate', command.birthDate),
    ...optional('nationality', command.nationality?.toUpperCase() ?? null),
    ...optional('occupation', command.occupation),
    ...optional('gender', command.gender),
    ...optional('phoneNumber', command.phoneNumber),
    ...optional('documentCountry', command.documentCountry?.toUpperCase() ?? null),
    ...(address ? { address } : {}),
  };
}

function toAddressDto(address: ResidentialAddress | null): ResidentialAddressDto | null {
  if (!address) {
    return null;
  }
  const dto: ResidentialAddressDto = {
    ...optional('streetName', address.streetName),
    ...optional('city', address.city),
    ...optional('state', address.state),
    ...optional('postalCode', address.postalCode),
    ...optional('country', address.country?.toUpperCase() ?? null),
  };
  return Object.keys(dto).length ? dto : null;
}

function optional<K extends string>(key: K, value: string | null): Partial<Record<K, string>> {
  const trimmed = value?.trim();
  return trimmed ? ({ [key]: trimmed } as Record<K, string>) : {};
}

export function toSavedDraft(dto: OnboardingDraftViewDto): SavedDraft {
  return { draft: normalizeDraft(dto.draft ?? {}), updatedAt: toDate(dto.updatedAt) };
}
