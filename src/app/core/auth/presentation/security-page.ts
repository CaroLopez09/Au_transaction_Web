import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toApiError } from '../../http/api-error';
import { mapApiError, UserFacingError } from '../../http/error-mapping';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { MfaEnrollment } from '../session.repository';
import { SessionStore } from '../session.store';
import { MfaEnrollmentPanel } from './mfa-enrollment';

/** Segundo factor de la cuenta propia: activarlo, o desactivarlo si el entorno no lo exige. */
@Component({
  selector: 'au-security-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, StatusBadge, ErrorState, ReactiveFormsModule, MfaEnrollmentPanel],
  template: `
    <au-page-header
      title="Seguridad"
      description="Verificación en dos pasos: además de la contraseña, un código de tu app autenticadora."
    />
    <p class="au-visually-hidden" aria-live="polite">{{ announcement() }}</p>
    @if (error(); as failure) {
      <au-error-state [error]="failure" />
    }

    <section class="card" aria-labelledby="mfa-status">
      <h2 id="mfa-status">Verificación en dos pasos</h2>
      @if (mfaEnabled()) {
        <au-status-badge label="Activa" tone="success" />
        @if (enforced()) {
          <p class="au-help">Tu organización la exige en este entorno: no se puede desactivar.</p>
        } @else {
          <p>Para desactivarla, escribe un código actual de tu app.</p>
          <div class="inline">
            <label class="au-label" for="disable-code">Código</label>
            <input
              id="disable-code"
              class="au-input au-num"
              [formControl]="disableCode"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
            />
            <button type="button" class="au-button au-button--secondary" [disabled]="busy()" (click)="disable()">
              {{ busy() ? 'Desactivando…' : 'Desactivar' }}
            </button>
          </div>
        }
      } @else if (enrollment(); as current) {
        <au-mfa-enrollment [enrollment]="current" [busy]="busy()" (confirmed)="enable($event)" />
      } @else {
        <au-status-badge label="Inactiva" tone="attention" />
        <p>Protege tu cuenta: sin el código, una contraseña robada no basta para entrar.</p>
        <button type="button" class="au-button au-button--primary" [disabled]="busy()" (click)="start()">
          {{ busy() ? 'Generando clave…' : 'Activar verificación en dos pasos' }}
        </button>
      }
    </section>
  `,
  styles: `
    .card {
      display: grid;
      gap: var(--au-space-3);
      max-width: 520px;
      padding: var(--au-space-5);
      border: 1px solid var(--au-border);
      border-radius: var(--au-radius-md, 10px);
      background: var(--au-surface);
    }
    .inline {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: var(--au-space-3);
    }
    .inline .au-input {
      max-width: 10rem;
    }
  `,
})
export class SecurityPage {
  private readonly session = inject(SessionStore);

  protected readonly mfaEnabled = computed(() => this.session.operator()?.mfaEnabled ?? false);
  protected readonly enforced = computed(() => this.session.operator()?.mfaEnforced ?? false);
  protected readonly enrollment = signal<MfaEnrollment | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<UserFacingError | null>(null);
  protected readonly announcement = signal('');
  protected readonly disableCode = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });

  protected async start(): Promise<void> {
    await this.run(async () => this.enrollment.set(await this.session.beginMfaSetup(null)));
  }

  protected async enable(code: string): Promise<void> {
    await this.run(async () => {
      await this.session.confirmMfaSetup(null, code);
      this.enrollment.set(null);
      this.announcement.set('Verificación en dos pasos activada.');
    });
  }

  protected async disable(): Promise<void> {
    this.disableCode.markAsTouched();
    if (this.disableCode.invalid) {
      return;
    }
    await this.run(async () => {
      await this.session.disableMfa(this.disableCode.value);
      this.disableCode.reset();
      this.announcement.set('Verificación en dos pasos desactivada.');
    });
  }

  private async run(work: () => Promise<void>): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      await work();
    } catch (error) {
      this.error.set(mapApiError(toApiError(error)));
    } finally {
      this.busy.set(false);
    }
  }
}
