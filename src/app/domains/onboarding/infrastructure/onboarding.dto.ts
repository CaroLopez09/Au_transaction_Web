/**
 * Espejo exacto del JSON del BFF. Con `default-property-inclusion: non_null`, todo lo que
 * puede ser null en Java llega ausente: por eso es opcional aquí.
 */

/** application/tenant/OnboardingView */
export interface OnboardingViewDto {
  tenantId: string;
  name: string;
  kiraUserId?: string;
  status: string;
  rejectionReason?: string;
  verificationTriggered: boolean;
  pendingFields?: string[];
  eligibleProducts?: EligibleProductDto[];
  readyForVirtualAccounts: boolean;
  enhancedDueDiligenceRequired: boolean;
}

/** domain/tenant/EligibleProduct */
export interface EligibleProductDto {
  productCode?: string;
  eligible: boolean;
  missingFields?: string[];
  unsupportedReason?: string;
}

/** application/tenant/UboView */
/** domain/shared/PostalAddress (dirección de residencia de un UBO, país ISO-3). */
export interface ResidentialAddressDto {
  streetName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface UboViewDto {
  id: string;
  personReferenceId?: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email?: string;
  documentType?: string;
  documentNumber?: string;
  hasOwnership: boolean;
  ownershipPercentage?: number;
  beneficialOwner: boolean;
  hasControl: boolean;
  signer: boolean;
  politicallyExposed: boolean;
  countryOfBirth?: string;
  roleInCompany?: string;
  birthDate?: string;
  nationality?: string;
  occupation?: string;
  gender?: string;
  phoneNumber?: string;
  documentCountry?: string;
  address?: ResidentialAddressDto;
  knownToKira: boolean;
  livenessStatus?: string;
  livenessLink?: string;
  livenessExpiresAt?: string;
}

/** application/tenant/UboCommands.SaveUbo */
export interface SaveUboDto {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  documentType?: string;
  documentNumber?: string;
  hasOwnership: boolean;
  ownershipPercentage: number;
  hasControl: boolean;
  isSigner: boolean;
  politicallyExposed: boolean;
  countryOfBirth: string;
  roleInCompany?: string;
  birthDate?: string;
  nationality?: string;
  occupation?: string;
  gender?: string;
  phoneNumber?: string;
  documentCountry?: string;
  address?: ResidentialAddressDto;
}

/** application/tenant/UboView.Roster */
export interface UboRosterDto {
  members?: UboViewDto[];
  totalOwnership?: number;
  hasBeneficialOwner: boolean;
  livenessComplete: boolean;
}

/** application/tenant/OnboardingDraftView */
export interface OnboardingDraftViewDto {
  draft?: Record<string, unknown>;
  updatedAt?: string;
}

/** application/tenant/OnboardingCommands.RegisterBusiness */
export interface RegisterBusinessDto {
  businessLegalName: string;
  email: string;
  sourceOfFunds: string;
}
