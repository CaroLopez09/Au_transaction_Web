import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toApiError } from '../../http/api-error';
import { mapApiError, UserFacingError } from '../../http/error-mapping';
import { AuLogo } from '../../../shared/ui/au-logo';
import { Icon } from '../../../shared/ui/icon';
import { safeReturnUrl } from '../auth.guards';
import { MfaEnrollment } from '../session.repository';
import { SessionStore } from '../session.store';
import { MfaEnrollmentPanel } from './mfa-enrollment';

type Stage =
  | { readonly kind: 'credentials' }
  | { readonly kind: 'code'; readonly challenge: string }
  | { readonly kind: 'setup'; readonly challenge: string; readonly enrollment: MfaEnrollment | null };

@Component({
  selector: 'au-sign-in-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AuLogo, Icon, MfaEnrollmentPanel],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.css',
})
export class SignInPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly errorSummary = viewChild<ElementRef<HTMLElement>>('errorSummary');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly mfaCode = inject(FormBuilder).nonNullable.control('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);
  protected readonly stage = signal<Stage>({ kind: 'credentials' });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly passwordVisible = signal(false);
  protected readonly error = signal<UserFacingError | null>(null);
  protected readonly sessionExpired = computed(() => this.session.endReason() === 'expired' && !this.error());

  protected fieldInvalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected fieldError(name: 'email' | 'password'): string | null {
    const serverMessage = this.error()?.fieldErrors[name];
    if (serverMessage) {
      return serverMessage;
    }
    const control = this.form.controls[name];
    if (!this.fieldInvalid(name)) {
      return null;
    }
    if (control.hasError('required')) {
      return name === 'email' ? 'Escribe tu correo.' : 'Escribe tu contraseña.';
    }
    return 'Escribe un correo válido, por ejemplo nombre@empresa.com.';
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    try {
      const step = await this.session.signIn(email.trim(), password);
      if (step.kind === 'done') {
        await this.enter();
      } else if (step.kind === 'mfa-code') {
        this.stage.set({ kind: 'code', challenge: step.challenge });
        queueMicrotask(() => document.getElementById('mfa-code')?.focus());
      } else if (step.kind === 'mfa-setup') {
        this.stage.set({ kind: 'setup', challenge: step.challenge, enrollment: null });
        const enrollment = await this.session.beginMfaSetup(step.challenge);
        this.stage.set({ kind: 'setup', challenge: step.challenge, enrollment });
      } else {
        await this.router.navigate(['/verificar-identidad']);
      }
    } catch (error) {
      this.fail(error);
    } finally {
      this.submitting.set(false);
    }
  }

  protected async submitCode(): Promise<void> {
    const current = this.stage();
    this.mfaCode.markAsTouched();
    if (current.kind !== 'code' || this.mfaCode.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.session.completeMfa(current.challenge, this.mfaCode.value);
      await this.enter();
    } catch (error) {
      this.mfaCode.reset();
      this.fail(error, false);
    } finally {
      this.submitting.set(false);
    }
  }

  protected async confirmSetup(code: string): Promise<void> {
    const current = this.stage();
    if (current.kind !== 'setup' || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.session.confirmMfaSetup(current.challenge, code);
      await this.enter();
    } catch (error) {
      this.fail(error, false);
    } finally {
      this.submitting.set(false);
    }
  }

  /** Vuelve a la contraseña: el reto caduca en minutos y no se reutiliza. */
  protected restart(): void {
    this.stage.set({ kind: 'credentials' });
    this.error.set(null);
    this.mfaCode.reset();
    this.form.controls.password.reset();
  }

  private async enter(): Promise<void> {
    await this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('volver')));
  }

  private fail(error: unknown, resetPassword = true): void {
    this.error.set(mapApiError(toApiError(error)));
    if (resetPassword) {
      this.form.controls.password.reset();
      this.stage.set({ kind: 'credentials' });
    }
    queueMicrotask(() => this.errorSummary()?.nativeElement.focus());
  }
}
