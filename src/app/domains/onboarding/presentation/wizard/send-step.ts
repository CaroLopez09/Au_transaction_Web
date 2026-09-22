import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { UserFacingError } from '../../../../core/http/error-mapping';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog';
import { ConsentCheck } from '../../../../shared/ui/consent-check';
import { ErrorState } from '../../../../shared/ui/error-state';
import { Icon } from '../../../../shared/ui/icon';
import { OnboardingWizardFacade } from '../../application/onboarding-wizard.facade';
import { OnboardingStatus } from '../../domain/onboarding-status';
import { WizardStep } from '../../domain/onboarding-draft';
import { termsPending } from '../../domain/onboarding.repository';

export interface SectionSummary {
  readonly step: WizardStep;
  readonly title: string;
  readonly gaps: readonly string[];
}

@Component({
  selector: 'au-send-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialog, ConsentCheck, ErrorState, Icon],
  template: `
    <p class="intro">
      Revisa lo que falta antes de enviar. Puedes enviar con datos incompletos: el proveedor indicará qué más necesita.
      <strong>Cuando el expediente esté completo, el proveedor inicia la verificación automáticamente.</strong>
    </p>

    <ul class="sections">
      @for (section of sections(); track section.step) {
        <li>
          <span class="state" [class.ok]="section.gaps.length === 0">
            <au-icon [name]="section.gaps.length === 0 ? 'check' : 'pending'" [size]="16" />
          </span>
          <div class="body">
            <p class="title">{{ section.title }}</p>
            @if (section.gaps.length) {
              <p class="missing">Falta: {{ section.gaps.join(', ') }}</p>
            } @else {
              <p class="missing">Completo</p>
            }
          </div>
          <button type="button" class="au-button au-button--quiet" (click)="goTo.emit(section.step)">Revisar</button>
        </li>
      }
    </ul>

    <div aria-live="assertive">
      @if (error(); as failure) {
        <au-error-state class="error" [error]="failure" />
      }
      @if (result(); as message) {
        <p class="au-notice success" role="status"><au-icon name="check" [size]="16" /> {{ message }}</p>
      }
    </div>

    @if (canManage()) {
      @if (!registered() && registrationGaps().length) {
        <p class="au-notice au-notice--attention">
          Para crear el expediente en el proveedor hacen falta al menos: {{ registrationGaps().join(', ') }}.
        </p>
      }
      @if (termsToAccept(); as terms) {
        <au-consent-check [(checked)]="termsAccepted">
          He leído y acepto
          @if (terms.url) {
            los <a [href]="terms.url" target="_blank" rel="noopener">términos y condiciones</a>
          } @else {
            los términos y condiciones
          }
          (versión {{ terms.version }}) en nombre de la empresa.
        </au-consent-check>
      }
      <div class="actions">
        <button
          type="button"
          class="au-button au-button--primary"
          [disabled]="
            wizard.busy() !== null ||
            (!registered() && registrationGaps().length > 0) ||
            (termsToAccept() !== null && !termsAccepted())
          "
          [attr.aria-busy]="wizard.busy() === 'register' || wizard.busy() === 'profile'"
          (click)="confirming.set(true)"
        >
          @switch (wizard.busy()) {
            @case ('register') {
              Creando expediente…
            }
            @case ('terms') {
              Registrando la aceptación…
            }
            @case ('profile') {
              Enviando datos…
            }
            @default {
              {{ registered() ? 'Enviar datos actualizados' : 'Crear expediente y enviar datos' }}
            }
          }
        </button>
      </div>
    } @else {
      <p class="au-notice">Envía la información una persona con rol de Administración.</p>
    }

    @if (confirming()) {
      <au-confirm-dialog
        [open]="true"
        [heading]="registered() ? 'Enviar datos al proveedor' : 'Crear expediente en el proveedor'"
        confirmLabel="Enviar"
        busyLabel="Enviando…"
        tone="primary"
        [busy]="wizard.busy() !== null"
        (confirmed)="send()"
        (cancelled)="confirming.set(false)"
      >
        <p>
          @if (!registered()) {
            Se creará la empresa ante el proveedor bancario y después se enviarán los datos rellenados.
          } @else {
            Se enviarán los datos rellenados en los pasos 1 a 3.
          }
          Si el expediente queda completo, la verificación empieza de inmediato.
        </p>
      </au-confirm-dialog>
    }
  `,
  styles: `
    .intro {
      max-width: 68ch;
      margin-bottom: var(--au-space-6);
    }
    .intro strong {
      font-weight: 500;
      color: var(--au-primary);
    }
    .sections {
      list-style: none;
      margin: 0 0 var(--au-space-6);
      padding: 0;
      border-top: 1px solid var(--au-hairline);
    }
    .sections li {
      display: flex;
      align-items: center;
      gap: var(--au-space-4);
      padding: var(--au-space-3) 0;
      border-bottom: 1px solid var(--au-hairline);
    }
    .state {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      flex: none;
      border-radius: 50%;
      background: var(--au-canvas-ledger);
      color: var(--au-text-warm);
    }
    .state.ok {
      background: var(--au-mint-soft);
      color: var(--au-success-text);
    }
    .body {
      flex: 1;
      min-width: 0;
    }
    .title {
      color: var(--au-primary);
      font-weight: 500;
    }
    .missing {
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
    .error,
    .success {
      margin-bottom: var(--au-space-4);
    }
    .success {
      display: flex;
      align-items: center;
      gap: var(--au-space-2);
    }
    .au-notice {
      margin-bottom: var(--au-space-4);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
  `,
})
export class SendStep {
  readonly sections = input.required<readonly SectionSummary[]>();
  readonly registered = input(false);
  readonly goTo = output<WizardStep>();
  readonly sent = output<OnboardingStatus>();

  protected readonly wizard = inject(OnboardingWizardFacade);
  private readonly session = inject(SessionStore);
  protected readonly canManage = computed(() => this.session.can('onboarding.manage'));
  protected readonly registrationGaps = this.wizard.registrationGaps;
  protected readonly confirming = signal(false);
  protected readonly error = signal<UserFacingError | null>(null);
  protected readonly result = signal<string | null>(null);
  protected readonly termsAccepted = signal(false);
  /** Términos vigentes aún sin aceptar; `null` si no hay nada que aceptar. */
  protected readonly termsToAccept = computed(() => {
    const terms = this.wizard.terms();
    return termsPending(terms) ? terms : null;
  });

  protected async send(): Promise<void> {
    this.error.set(null);
    this.result.set(null);
    // El borrador se guarda antes de enviar: si el proveedor falla, lo rellenado no se pierde.
    if (!(await this.wizard.saveDraft())) {
      this.confirming.set(false);
      this.error.set(this.wizard.saveError());
      return;
    }
    if (!this.registered()) {
      const created = await this.wizard.register();
      if (!created) {
        return;
      }
      if (!created.ok) {
        this.confirming.set(false);
        this.error.set(created.error);
        return;
      }
    }
    const terms = this.termsToAccept();
    if (terms?.version) {
      const accepted = await this.wizard.acceptTerms(terms.version);
      if (!accepted) {
        return;
      }
      if (!accepted.ok) {
        this.confirming.set(false);
        this.error.set(accepted.error);
        return;
      }
    }
    const profile = await this.wizard.sendProfile();
    this.confirming.set(false);
    if (!profile) {
      return;
    }
    if (profile.ok) {
      this.result.set('Datos enviados al proveedor. Revisa en «Verificación» lo que todavía pide.');
      this.sent.emit(profile.value);
    } else {
      this.error.set(profile.error);
    }
  }
}
