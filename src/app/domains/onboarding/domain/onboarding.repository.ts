import { Observable } from 'rxjs';
import { BeneficialOwner, OwnershipRoster, SaveBeneficialOwner } from './beneficial-owner';
import { OnboardingDraft } from './onboarding-draft';
import { OnboardingStatus } from './onboarding-status';

/** Puerto de vinculación. Implementación HTTP en infrastructure/. */
export abstract class OnboardingRepository {
  /** GET /api/onboarding — estado local, sin llamar al proveedor. */
  abstract status(): Observable<OnboardingStatus>;
  /** POST /api/onboarding/refresh — relee en el proveedor. */
  abstract refresh(): Observable<OnboardingStatus>;
  /** GET /api/ubos — registro local de beneficiarios con la validación de grupo. */
  abstract roster(): Observable<OwnershipRoster>;
  /** POST /api/ubos — alta o edición local; no llama al proveedor. */
  abstract saveOwner(command: SaveBeneficialOwner): Observable<BeneficialOwner>;

  /** GET /api/onboarding/draft — borrador guardado en el BFF (nunca en el proveedor). */
  abstract draft(): Observable<SavedDraft>;
  /** PUT /api/onboarding/draft — reemplaza el borrador completo. */
  abstract saveDraft(draft: OnboardingDraft): Observable<SavedDraft>;
  /** POST /api/onboarding — crea el expediente en el proveedor con lo mínimo. */
  abstract register(command: RegisterBusiness): Observable<OnboardingStatus>;
  /** PUT /api/onboarding — envía el perfil (el BFF reenvía la fusión completa). */
  abstract completeProfile(profile: Record<string, unknown>): Observable<OnboardingStatus>;
  /** POST /api/onboarding/documents — registro de identificación de la empresa con sus archivos. */
  abstract attachCompanyDocuments(command: AttachDocuments): Observable<OnboardingStatus>;
  /** POST /api/ubos/{id}/documents — documento de identidad de una persona. */
  abstract attachOwnerDocuments(ownerId: string, command: AttachDocuments): Observable<BeneficialOwner>;
  /** POST /api/ubos/sync — envía el grupo completo de beneficiarios al proveedor. */
  abstract syncOwners(): Observable<OnboardingStatus>;
  /** POST /api/ubos/liveness-links — un enlace por beneficiario final (exige verificación disparada). */
  abstract requestLivenessLinks(): Observable<OwnershipRoster>;
}

export interface SavedDraft {
  readonly draft: OnboardingDraft;
  readonly updatedAt: Date | null;
}

export interface RegisterBusiness {
  readonly businessLegalName: string;
  readonly email: string;
  readonly sourceOfFunds: string;
}

export interface DocumentFile {
  /** Papel del archivo: front, back, selfie o file_*. */
  readonly role: string;
  readonly file: File;
}

export interface AttachDocuments {
  readonly informationType: string;
  /** ISO-3166 alfa-3. */
  readonly issuingCountry: string;
  readonly number: string | null;
  /** AAAA-MM-DD */
  readonly expiration: string | null;
  readonly files: readonly DocumentFile[];
}
