export type LivenessStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'FAILED' | 'UNKNOWN';

export interface LivenessCheck {
  readonly status: LivenessStatus;
  /** Enlace individual del proveedor (7 días). La redirección no confirma el resultado. */
  readonly link: string | null;
  readonly expiresAt: Date | null;
}

export interface BeneficialOwner {
  readonly id: string;
  /** La vista del BFF solo trae el nombre completo (UboView.fullName), no nombre y apellido por separado. */
  readonly fullName: string;
  /** Kira empareja a cada persona por correo: sin él no se le pueden subir documentos. */
  readonly email: string | null;
  readonly documentType: string | null;
  readonly documentNumber: string | null;
  readonly hasOwnership: boolean;
  /** Porcentaje de participación (0–100). No es dinero. */
  readonly ownershipPercentage: number | null;
  readonly beneficialOwner: boolean;
  readonly hasControl: boolean;
  readonly signer: boolean;
  readonly politicallyExposed: boolean;
  /** ISO-3166 alfa-3. */
  readonly countryOfBirth: string | null;
  readonly roleInCompany: string | null;
  readonly liveness: LivenessCheck;
}

/** Lo que el proveedor valida sobre el grupo, no sobre cada persona. */
export interface OwnershipRoster {
  readonly members: readonly BeneficialOwner[];
  readonly totalOwnership: number;
  readonly hasBeneficialOwner: boolean;
  readonly livenessComplete: boolean;
}

export function parseLivenessStatus(raw: string | null | undefined): LivenessStatus {
  const normalized = raw?.trim().toUpperCase();
  switch (normalized) {
    case 'PENDING':
    case 'COMPLETED':
    case 'EXPIRED':
    case 'FAILED':
      return normalized;
    default:
      return 'UNKNOWN';
  }
}

/**
 * Alta (sin `id`) o edición (con `id`) local de un beneficiario — POST /api/ubos.
 * En edición el BFF solo actualiza documento, participación, control, firma, PEP y país:
 * nombre, apellido y cargo quedan como se dieron de alta (gap G-21).
 */
export type SaveBeneficialOwner = RegisterBeneficialOwner | UpdateBeneficialOwner;

/** Datos que el BFF sí actualiza en ambos casos. */
export interface BeneficialOwnerRole {
  readonly email: string | null;
  readonly documentType: string | null;
  readonly documentNumber: string | null;
  readonly hasOwnership: boolean;
  readonly ownershipPercentage: number;
  readonly hasControl: boolean;
  readonly isSigner: boolean;
  readonly politicallyExposed: boolean;
  readonly countryOfBirth: string;
}

export interface RegisterBeneficialOwner extends BeneficialOwnerRole {
  readonly kind: 'register';
  readonly firstName: string;
  readonly lastName: string;
  readonly roleInCompany: string | null;
}

export interface UpdateBeneficialOwner extends BeneficialOwnerRole {
  readonly kind: 'update';
  readonly id: string;
  /** Nombre vigente; el BFF no permite cambiarlo. */
  readonly fullName: string;
}

/** Ubo.BENEFICIAL_OWNER_THRESHOLD del BFF: con propiedad declarada y ≥ 5 % cuenta como beneficiario final. */
export const BENEFICIAL_OWNER_THRESHOLD = 5;

export function qualifiesAsBeneficialOwner(hasOwnership: boolean, ownershipPercentage: number | null): boolean {
  return hasOwnership && (ownershipPercentage ?? 0) >= BENEFICIAL_OWNER_THRESHOLD;
}

export type RosterWarning = 'no-beneficial-owner' | 'ownership-over-100';

/**
 * Condiciones que harán fallar la sincronización con el proveedor (UboRoster.assertReadyForVerification).
 * Guardar en local sí se permite: se avisa antes de que el problema aparezca al sincronizar.
 */
export function rosterWarnings(roster: OwnershipRoster): RosterWarning[] {
  if (roster.members.length === 0) {
    return [];
  }
  const warnings: RosterWarning[] = [];
  if (!roster.hasBeneficialOwner) {
    warnings.push('no-beneficial-owner');
  }
  if (roster.totalOwnership > 100) {
    warnings.push('ownership-over-100');
  }
  return warnings;
}

/** Nunca se muestra un documento completo en listados. */
export { maskTail as maskDocument } from '../../../shared/utilities/mask';
