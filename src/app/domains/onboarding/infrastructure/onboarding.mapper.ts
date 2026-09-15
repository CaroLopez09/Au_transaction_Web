import { BeneficialOwner, OwnershipRoster, parseLivenessStatus, SaveBeneficialOwner } from '../domain/beneficial-owner';
import { EligibleProduct, OnboardingStatus, parseKybStatus } from '../domain/onboarding-status';
import {
  EligibleProductDto,
  OnboardingDraftViewDto,
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
    liveness: {
      status: parseLivenessStatus(dto.livenessStatus),
      link: dto.livenessLink ?? null,
      expiresAt: dto.livenessExpiresAt ? new Date(dto.livenessExpiresAt) : null,
    },
  };
}

/** Opcionales vacíos no viajan: el BFF distingue "sin documento" de un texto en blanco. */
export function toSaveUboDto(command: SaveBeneficialOwner): SaveUboDto {
  const common = {
    ...optional('email', command.email),
    ...optional('documentType', command.documentType),
    ...optional('documentNumber', command.documentNumber),
    hasOwnership: command.hasOwnership,
    ownershipPercentage: command.ownershipPercentage,
    hasControl: command.hasControl,
    isSigner: command.isSigner,
    politicallyExposed: command.politicallyExposed,
    countryOfBirth: command.countryOfBirth.trim().toUpperCase(),
  };
  if (command.kind === 'register') {
    return {
      firstName: command.firstName.trim(),
      lastName: command.lastName.trim(),
      ...optional('roleInCompany', command.roleInCompany),
      ...common,
    };
  }
  return { id: command.id, ...nameFieldsForUpdate(command.fullName), ...common };
}

/**
 * En edición el BFF valida `firstName`/`lastName` como obligatorios pero no los aplica
 * (SyncUbosService.save solo los usa al crear) y la vista solo expone `fullName`.
 * Se reenvía el nombre vigente repartido en la primera separación para superar la validación;
 * el backend lo ignora (gap G-21). `roleInCompany` tampoco se aplica y no se envía.
 */
export function nameFieldsForUpdate(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const separator = trimmed.indexOf(' ');
  return separator === -1
    ? { firstName: trimmed, lastName: trimmed }
    : { firstName: trimmed.slice(0, separator), lastName: trimmed.slice(separator + 1) };
}

function optional<K extends string>(key: K, value: string | null): Partial<Record<K, string>> {
  const trimmed = value?.trim();
  return trimmed ? ({ [key]: trimmed } as Record<K, string>) : {};
}

export function toSavedDraft(dto: OnboardingDraftViewDto): SavedDraft {
  return { draft: normalizeDraft(dto.draft ?? {}), updatedAt: toDate(dto.updatedAt) };
}
