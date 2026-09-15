import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { UserFacingError } from '../../../core/http/error-mapping';
import { ActionResult, fetchRemote, runAction } from '../../../shared/utilities/remote-data';
import { BeneficialOwner } from '../domain/beneficial-owner';
import {
  ActivitySection,
  CompanySection,
  EMPTY_DRAFT,
  OnboardingDraft,
  registrationGaps,
  RepresentativeSection,
  toProfile,
} from '../domain/onboarding-draft';
import { OnboardingStatus } from '../domain/onboarding-status';
import { AttachDocuments, OnboardingRepository } from '../domain/onboarding.repository';
import { OnboardingFacade } from './onboarding.facade';

export type WizardAction =
  | 'save-draft'
  | 'register'
  | 'profile'
  | 'sync-owners'
  | 'liveness'
  | `company-documents:${string}`
  | `owner-documents:${string}`;

/**
 * Estado del asistente de vinculación: borrador (en el BFF) y envíos al proveedor.
 * Guardar el borrador nunca llama al proveedor; enviar sí, y solo por acción explícita de la persona.
 */
@Injectable()
export class OnboardingWizardFacade {
  private readonly repository = inject(OnboardingRepository);
  private readonly onboarding = inject(OnboardingFacade);

  private readonly draftState = signal<OnboardingDraft>(EMPTY_DRAFT);
  private readonly loadedState = signal<'loading' | 'ready' | 'error'>('loading');
  private readonly loadErrorState = signal<UserFacingError | null>(null);
  private readonly dirtyState = signal(false);
  private readonly savedAtState = signal<Date | null>(null);
  private readonly busyState = signal<WizardAction | null>(null);
  private readonly saveErrorState = signal<UserFacingError | null>(null);

  readonly draft = this.draftState.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  readonly loadError = this.loadErrorState.asReadonly();
  /** Hay cambios en pantalla que no están en el borrador guardado. */
  readonly dirty = this.dirtyState.asReadonly();
  readonly savedAt = this.savedAtState.asReadonly();
  readonly busy = this.busyState.asReadonly();
  readonly saveError = this.saveErrorState.asReadonly();
  readonly registrationGaps = computed(() => registrationGaps(this.draftState()));

  async load(): Promise<void> {
    this.loadedState.set('loading');
    const result = await fetchRemote(this.repository.draft());
    if (result.status === 'success') {
      this.draftState.set(result.data.draft);
      this.savedAtState.set(result.data.updatedAt);
      this.dirtyState.set(false);
      this.loadedState.set('ready');
    } else if (result.status === 'error') {
      this.loadErrorState.set(result.error);
      this.loadedState.set('error');
    }
  }

  updateCompany(company: CompanySection): void {
    this.patch({ company });
  }

  updateActivity(activity: ActivitySection): void {
    this.patch({ activity });
  }

  updateRepresentative(representative: RepresentativeSection): void {
    this.patch({ representative });
  }

  /** Guarda el borrador si hay cambios. Devuelve `true` si queda guardado (o no había nada que guardar). */
  async saveDraft(): Promise<boolean> {
    if (!this.dirtyState()) {
      return true;
    }
    if (this.busyState()) {
      return false;
    }
    this.busyState.set('save-draft');
    this.saveErrorState.set(null);
    const snapshot = this.draftState();
    try {
      const result = await runAction(this.repository.saveDraft(snapshot));
      if (!result.ok) {
        this.saveErrorState.set(result.error);
        return false;
      }
      this.savedAtState.set(result.value.updatedAt);
      // Si la persona siguió escribiendo mientras se guardaba, el borrador sigue sucio.
      this.dirtyState.set(this.draftState() !== snapshot);
      return true;
    } finally {
      this.busyState.set(null);
    }
  }

  /** Crea el expediente en el proveedor (POST /api/onboarding) con razón social, correo y origen de fondos. */
  async register(): Promise<ActionResult<OnboardingStatus> | null> {
    const draft = this.draftState();
    return this.runStatus(
      'register',
      this.repository.register({
        businessLegalName: draft.company.business_legal_name,
        email: draft.company.email,
        sourceOfFunds: draft.activity.source_of_funds,
      }),
    );
  }

  /** Envía todo lo rellenado (PUT /api/onboarding). La verificación arranca sola cuando el expediente está completo. */
  sendProfile(): Promise<ActionResult<OnboardingStatus> | null> {
    return this.runStatus('profile', this.repository.completeProfile(toProfile(this.draftState())));
  }

  syncOwners(): Promise<ActionResult<OnboardingStatus> | null> {
    return this.runStatus('sync-owners', this.repository.syncOwners());
  }

  async requestLivenessLinks(): Promise<ActionResult<unknown> | null> {
    if (this.busyState()) {
      return null;
    }
    this.busyState.set('liveness');
    try {
      const result = await runAction(this.repository.requestLivenessLinks());
      if (result.ok) {
        this.onboarding.applyRoster(result.value);
      }
      return result;
    } finally {
      this.busyState.set(null);
    }
  }

  /** Sube un registro de la empresa. El archivo va al proveedor; el borrador solo anota qué se subió y cuándo. */
  async attachCompanyDocuments(command: AttachDocuments): Promise<ActionResult<OnboardingStatus> | null> {
    const result = await this.runStatus(
      `company-documents:${command.informationType}`,
      this.repository.attachCompanyDocuments(command),
    );
    if (result?.ok) {
      this.patch({
        documents: {
          ...this.draftState().documents,
          [command.informationType]: {
            fileNames: command.files.map((document) => document.file.name),
            uploadedAt: new Date().toISOString(),
          },
        },
      });
      await this.saveDraft();
    }
    return result;
  }

  async attachOwnerDocuments(ownerId: string, command: AttachDocuments): Promise<ActionResult<BeneficialOwner> | null> {
    if (this.busyState()) {
      return null;
    }
    this.busyState.set(`owner-documents:${ownerId}`);
    try {
      const result = await runAction(this.repository.attachOwnerDocuments(ownerId, command));
      if (result.ok) {
        await this.onboarding.reloadRosterQuietly();
      }
      return result;
    } finally {
      this.busyState.set(null);
    }
  }

  private patch(change: Partial<OnboardingDraft>): void {
    this.draftState.update((draft) => ({ ...draft, ...change }));
    this.dirtyState.set(true);
  }

  private async runStatus(
    action: WizardAction,
    source: Observable<OnboardingStatus>,
  ): Promise<ActionResult<OnboardingStatus> | null> {
    if (this.busyState()) {
      return null;
    }
    this.busyState.set(action);
    try {
      const result = await runAction(source);
      if (result.ok) {
        this.onboarding.applyStatus(result.value);
      }
      return result;
    } finally {
      this.busyState.set(null);
    }
  }
}
