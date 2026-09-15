import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { Icon } from '../../../shared/ui/icon';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { dataOf, errorOf } from '../../../shared/utilities/remote-data';
import { OnboardingWizardFacade } from '../application/onboarding-wizard.facade';
import { OnboardingFacade } from '../application/onboarding.facade';
import {
  activityGaps,
  companyGaps,
  ownersGaps,
  pendingByStep,
  representativeGaps,
  StepProgress,
  WizardStep,
} from '../domain/onboarding-draft';
import { canRefreshFromProvider, onboardingStage } from '../domain/onboarding-status';
import { stageCopy } from './onboarding-copy';
import { ActivityStep } from './wizard/activity-step';
import { CompanyStep } from './wizard/company-step';
import { DocumentsStep } from './wizard/documents-step';
import { OwnersStep } from './wizard/owners-step';
import { RepresentativeStep } from './wizard/representative-step';
import { SectionSummary, SendStep } from './wizard/send-step';
import { VerificationStep } from './wizard/verification-step';

type StepKey = WizardStep | 'verification';

interface StepDefinition {
  readonly key: StepKey;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
}

const STEPS: readonly StepDefinition[] = [
  {
    key: 'company',
    slug: 'empresa',
    title: 'Empresa',
    description: 'Datos de identificación, contacto, constitución y dirección.',
  },
  {
    key: 'activity',
    slug: 'actividad',
    title: 'Actividad y riesgo',
    description: 'Para qué usará la cuenta y de dónde vienen los fondos.',
  },
  {
    key: 'representative',
    slug: 'representante',
    title: 'Representante legal',
    description: 'Quién actúa en nombre de la empresa.',
  },
  {
    key: 'owners',
    slug: 'beneficiarios',
    title: 'Beneficiarios',
    description: 'Personas con participación o control, y su documento de identidad.',
  },
  {
    key: 'review',
    slug: 'enviar',
    title: 'Enviar al proveedor',
    description: 'Revisa y envía la información al proveedor bancario.',
  },
  {
    key: 'documents',
    slug: 'documentos',
    title: 'Documentos de la empresa',
    description: 'Súbelos cuando los tengas; los que falten quedan pendientes.',
  },
  {
    key: 'verification',
    slug: 'verificacion',
    title: 'Verificación',
    description: 'Prueba de vida y lo que el proveedor todavía pide.',
  },
];

/** Tras este tiempo sin cambios, el borrador se guarda solo. */
const AUTOSAVE_IDLE_MS = 3000;

@Component({
  selector: 'au-onboarding-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader,
    StatusBadge,
    ErrorState,
    Skeleton,
    Icon,
    DateTimePipe,
    CompanyStep,
    ActivityStep,
    RepresentativeStep,
    OwnersStep,
    SendStep,
    DocumentsStep,
    VerificationStep,
  ],
  providers: [OnboardingWizardFacade],
  templateUrl: './onboarding-page.html',
  styleUrl: './onboarding-page.css',
})
export class OnboardingPage implements OnInit {
  /** `?paso=` en la URL: permite retomar el asistente donde se dejó. */
  readonly paso = input<string | undefined>();

  protected readonly facade = inject(OnboardingFacade);
  protected readonly wizard = inject(OnboardingWizardFacade);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected readonly steps = STEPS;
  protected readonly canManage = computed(() => this.session.can('onboarding.manage'));
  protected readonly status = computed(() => dataOf(this.facade.status()));
  protected readonly statusError = computed(() => errorOf(this.facade.status()));
  private readonly roster = computed(() => dataOf(this.facade.roster()));
  protected readonly registered = computed(() => this.status()?.providerUserId != null);
  protected readonly stage = computed(() => {
    const status = this.status();
    return status ? stageCopy(onboardingStage(status), status.companyName, this.canManage()) : null;
  });
  protected readonly canRefresh = computed(() => {
    const status = this.status();
    return !!status && canRefreshFromProvider(status);
  });
  protected readonly pending = computed(() => pendingByStep(this.status()));
  protected readonly defaultCountry = computed(() => this.wizard.draft().company.formation_country);

  protected readonly current = computed<StepDefinition>(
    () => STEPS.find((step) => step.slug === this.paso()) ?? STEPS[0],
  );
  protected readonly currentIndex = computed(() => STEPS.indexOf(this.current()));

  private readonly gaps = computed<Record<StepKey, string[]>>(() => {
    const draft = this.wizard.draft();
    return {
      company: companyGaps(draft.company),
      activity: activityGaps(draft.activity),
      representative: representativeGaps(draft.representative),
      owners: ownersGaps(this.roster()),
      review: [],
      documents: [],
      verification: [],
    };
  });

  protected readonly sections = computed<SectionSummary[]>(() =>
    STEPS.slice(0, 4).map((step) => ({ step: step.key as WizardStep, title: step.title, gaps: this.gaps()[step.key] })),
  );

  protected readonly progress = computed<Record<StepKey, StepProgress>>(() => {
    const draft = this.wizard.draft();
    const status = this.status();
    const pending = this.pending();
    const filled = (section: object) =>
      Object.values(section).some((value) => typeof value === 'string' && value !== '');
    const byGaps = (key: StepKey, touched: boolean): StepProgress =>
      this.gaps()[key].length === 0 && pending[key as WizardStep]?.length === 0
        ? 'complete'
        : touched
          ? 'incomplete'
          : 'empty';
    return {
      company: byGaps('company', filled(draft.company)),
      activity: byGaps('activity', filled(draft.activity)),
      representative: byGaps('representative', filled(draft.representative)),
      owners: byGaps('owners', (this.roster()?.members.length ?? 0) > 0),
      review: this.registered() ? 'complete' : 'empty',
      documents: !this.registered()
        ? 'empty'
        : pending.documents.length === 0 && Object.keys(draft.documents).length > 0
          ? 'complete'
          : Object.keys(draft.documents).length > 0
            ? 'incomplete'
            : 'empty',
      verification:
        status?.status === 'VERIFIED' ? 'complete' : status && status.status !== 'CREATED' ? 'incomplete' : 'empty',
    };
  });

  protected readonly saveLabel = computed(() => {
    if (this.wizard.busy() === 'save-draft') return 'Guardando…';
    if (this.wizard.saveError()) return 'No se pudo guardar el borrador';
    if (this.wizard.dirty()) return 'Cambios sin guardar';
    return this.wizard.savedAt() ? 'Borrador guardado' : 'Sin borrador guardado';
  });

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.wizard.draft();
      if (!this.wizard.dirty() || !this.canManage()) {
        return;
      }
      this.clearAutosave();
      this.autosaveTimer = setTimeout(() => void this.wizard.saveDraft(), AUTOSAVE_IDLE_MS);
    });
    const warnOnLeave = (event: BeforeUnloadEvent) => {
      if (this.wizard.dirty()) {
        event.preventDefault();
      }
    };
    this.document.defaultView?.addEventListener('beforeunload', warnOnLeave);
    inject(DestroyRef).onDestroy(() => {
      this.document.defaultView?.removeEventListener('beforeunload', warnOnLeave);
      this.clearAutosave();
      if (this.wizard.dirty() && this.canManage()) {
        void this.wizard.saveDraft();
      }
    });
  }

  ngOnInit(): void {
    this.facade.load();
    void this.wizard.load();
  }

  protected async goTo(key: StepKey): Promise<void> {
    const step = STEPS.find((item) => item.key === key);
    if (!step || step === this.current()) {
      return;
    }
    if (this.canManage()) {
      this.clearAutosave();
      await this.wizard.saveDraft();
    }
    await this.router.navigate([], { queryParams: { paso: step.slug }, replaceUrl: false });
    this.document.getElementById('wizard-step-title')?.focus();
  }

  protected previous(): void {
    const index = this.currentIndex();
    if (index > 0) void this.goTo(STEPS[index - 1].key);
  }

  protected next(): void {
    const index = this.currentIndex();
    if (index < STEPS.length - 1) void this.goTo(STEPS[index + 1].key);
  }

  protected async saveNow(): Promise<void> {
    this.clearAutosave();
    await this.wizard.saveDraft();
  }

  protected selectStep(event: Event): void {
    void this.goTo((event.target as HTMLSelectElement).value as StepKey);
  }

  private clearAutosave(): void {
    if (this.autosaveTimer !== null) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }
}
