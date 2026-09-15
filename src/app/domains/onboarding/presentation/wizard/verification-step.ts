import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { UserFacingError } from '../../../../core/http/error-mapping';
import { ConsentCheck } from '../../../../shared/ui/consent-check';
import { DateTimePipe } from '../../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../../shared/ui/error-state';
import { Icon } from '../../../../shared/ui/icon';
import { StatusBadge } from '../../../../shared/ui/status-badge';
import { dataOf } from '../../../../shared/utilities/remote-data';
import { OnboardingWizardFacade } from '../../application/onboarding-wizard.facade';
import { OnboardingFacade } from '../../application/onboarding.facade';
import { onboardingSteps } from '../../domain/onboarding-progress';
import { OnboardingStatus } from '../../domain/onboarding-status';
import { livenessCopy } from '../onboarding-copy';
import { OnboardingSteps } from '../onboarding-steps';
import { StepGaps } from './step-gaps';

@Component({
  selector: 'au-verification-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OnboardingSteps, StepGaps, StatusBadge, DateTimePipe, ErrorState, Icon, ConsentCheck],
  template: `
    @if (status(); as current) {
      <au-onboarding-steps [steps]="steps()" />

      <section class="block" aria-labelledby="liveness-title">
        <h3 id="liveness-title">Prueba de vida de los beneficiarios finales</h3>
        <p class="help">
          Cada beneficiario final recibe un enlace personal (válido 7 días). El resultado lo confirma el proveedor, no
          la página a la que vuelve la persona.
        </p>
        @if (error(); as failure) {
          <au-error-state class="error" [error]="failure" />
        }
        @if (owners().length) {
          <ul class="owners">
            @for (owner of owners(); track owner.id) {
              <li>
                <span class="name">{{ owner.fullName }}</span>
                <au-status-badge
                  [label]="liveness(owner.liveness.status).label"
                  [tone]="liveness(owner.liveness.status).tone"
                />
                @if (owner.liveness.link && owner.liveness.status === 'PENDING') {
                  <a
                    class="au-button au-button--quiet"
                    [href]="owner.liveness.link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <au-icon name="external-link" [size]="16" /> Abrir enlace
                  </a>
                  @if (owner.liveness.expiresAt) {
                    <span class="help">Vence {{ owner.liveness.expiresAt | auDateTime }}</span>
                  }
                }
              </li>
            }
          </ul>
        } @else {
          <p class="help">Aún no hay beneficiarios finales registrados.</p>
        }
        @if (canManage()) {
          @if (current.verificationTriggered || current.status !== 'CREATED') {
            <au-consent-check [(checked)]="biometricConsent">
              Cada beneficiario final autorizó el tratamiento de sus datos biométricos (imagen facial) para la prueba de
              vida con el proveedor bancario.
            </au-consent-check>
            <button
              type="button"
              class="au-button au-button--secondary"
              [disabled]="wizard.busy() !== null || !biometricConsent()"
              [attr.aria-busy]="wizard.busy() === 'liveness'"
              (click)="requestLinks()"
            >
              {{ wizard.busy() === 'liveness' ? 'Solicitando…' : 'Solicitar enlaces de prueba de vida' }}
            </button>
          } @else {
            <p class="au-notice">Los enlaces se pueden pedir cuando el proveedor haya iniciado la verificación.</p>
          }
        }
      </section>

      <au-step-gaps
        [gaps]="[]"
        [pending]="current.pendingFields"
        doneLabel="El proveedor no pide más información en este momento."
      />
    }
  `,
  styles: `
    .block {
      margin: var(--au-space-8) 0;
      padding-top: var(--au-space-6);
      border-top: 1px solid var(--au-hairline);
    }
    h3 {
      font-size: var(--au-fs-body);
      font-weight: 500;
    }
    .help {
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
    .block > .help {
      margin: var(--au-space-1) 0 var(--au-space-4);
      max-width: 66ch;
    }
    .error,
    .au-notice {
      margin-bottom: var(--au-space-4);
    }
    .owners {
      list-style: none;
      margin: 0 0 var(--au-space-4);
      padding: 0;
    }
    .owners li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--au-space-2) var(--au-space-4);
      min-height: 44px;
    }
    .name {
      min-width: 180px;
      color: var(--au-primary);
      font-weight: 500;
    }
  `,
})
export class VerificationStep {
  readonly status = input.required<OnboardingStatus | null>();

  protected readonly wizard = inject(OnboardingWizardFacade);
  private readonly onboarding = inject(OnboardingFacade);
  private readonly session = inject(SessionStore);
  protected readonly canManage = computed(() => this.session.can('onboarding.manage'));
  protected readonly liveness = livenessCopy;
  protected readonly error = signal<UserFacingError | null>(null);
  protected readonly biometricConsent = signal(false);
  protected readonly owners = computed(() =>
    (dataOf(this.onboarding.roster())?.members ?? []).filter((owner) => owner.beneficialOwner),
  );
  protected readonly steps = computed(() => {
    const status = this.status();
    return status ? onboardingSteps(status, dataOf(this.onboarding.roster())) : [];
  });

  protected async requestLinks(): Promise<void> {
    this.error.set(null);
    const result = await this.wizard.requestLivenessLinks();
    if (result && !result.ok) {
      this.error.set(result.error);
    }
  }
}
