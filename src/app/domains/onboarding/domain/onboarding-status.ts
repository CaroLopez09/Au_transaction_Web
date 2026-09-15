/** Estados KYB del BFF (TenantStatus). `UNKNOWN` cubre cualquier valor futuro sin romper la UI. */
export type KybStatus = 'CREATED' | 'VERIFYING' | 'REVIEW' | 'VERIFIED' | 'REJECTED' | 'UNKNOWN';

/** Producto objetivo de la integración (EligibleProduct.USA_VIRTUAL_ACCOUNTS). */
export const USA_VIRTUAL_ACCOUNTS = 'usa-virtual-accounts';

export interface EligibleProduct {
  readonly productCode: string;
  readonly eligible: boolean;
  readonly missingFields: readonly string[];
  readonly unsupportedReason: string | null;
}

export interface OnboardingStatus {
  readonly tenantId: string;
  readonly companyName: string;
  /** Id de la empresa en el proveedor; `null` mientras no se haya dado de alta. */
  readonly providerUserId: string | null;
  readonly status: KybStatus;
  readonly rawStatus: string;
  /** Motivos del rechazo recibidos por webhook; el proveedor no los devuelve en ninguna lectura. */
  readonly rejectionReason: string | null;
  readonly verificationTriggered: boolean;
  /** Campos que el proveedor sigue pidiendo para el producto objetivo: fuente de verdad del formulario. */
  readonly pendingFields: readonly string[];
  readonly eligibleProducts: readonly EligibleProduct[];
  readonly readyForVirtualAccounts: boolean;
  readonly enhancedDueDiligenceRequired: boolean;
}

/**
 * Etapa UX derivada (docs/frontend-architecture.md §8). Separa tres ideas que el estado solo no distingue:
 * expediente creado, KYB aprobado y producto elegible.
 */
export type OnboardingStage =
  | 'not-started'
  | 'information-pending'
  | 'verifying'
  | 'in-review'
  | 'product-pending'
  | 'ready'
  | 'rejected'
  | 'unknown';

export function onboardingStage(status: OnboardingStatus): OnboardingStage {
  switch (status.status) {
    case 'REJECTED':
      return 'rejected';
    case 'VERIFIED':
      return status.readyForVirtualAccounts ? 'ready' : 'product-pending';
    case 'REVIEW':
      return 'in-review';
    case 'VERIFYING':
      return 'verifying';
    case 'CREATED':
      return status.providerUserId === null ? 'not-started' : 'information-pending';
    case 'UNKNOWN':
      return 'unknown';
  }
}

/** Solo tiene sentido releer en el proveedor una empresa ya dada de alta (si no, el BFF responde 422). */
export function canRefreshFromProvider(status: OnboardingStatus): boolean {
  return status.providerUserId !== null;
}

export function parseKybStatus(raw: string | null | undefined): KybStatus {
  const normalized = raw?.trim().toUpperCase();
  switch (normalized) {
    case 'CREATED':
    case 'VERIFYING':
    case 'REVIEW':
    case 'VERIFIED':
    case 'REJECTED':
      return normalized;
    default:
      return 'UNKNOWN';
  }
}
