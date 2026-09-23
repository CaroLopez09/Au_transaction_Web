import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../http/api-error';
import { mapApiError, UserFacingError } from '../../http/error-mapping';
import { AuLogo } from '../../../shared/ui/au-logo';
import { Icon } from '../../../shared/ui/icon';
import { SessionStore } from '../session.store';

type Stage = { readonly kind: 'email' } | { readonly kind: 'otp' } | { readonly kind: 'new-password' } | { readonly kind: 'done' };

/** "¿Olvidaste tu contraseña?": correo → OTP → nueva contraseña. El BFF nunca confirma si el correo existe. */
@Component({
  selector: 'au-forgot-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuLogo, Icon],
  templateUrl: './forgot-password-page.html',
  styleUrl: './sign-in-page.css',
})
export class ForgotPasswordPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly errorSummary = viewChild<ElementRef<HTMLElement>>('errorSummary');

  private readonly builder = inject(FormBuilder);

  protected readonly emailForm = this.builder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly otpControl = this.builder.nonNullable.control('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);
  protected readonly newPasswordForm = this.builder.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(100)]],
    confirmNewPassword: ['', Validators.required],
  });

  protected readonly stage = signal<Stage>({ kind: 'email' });
  protected readonly submitting = signal(false);
  protected readonly error = signal<UserFacingError | null>(null);

  private email = '';
  private resetToken = '';

  protected async submitEmail(): Promise<void> {
    if (this.emailForm.invalid || this.submitting()) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.email = this.emailForm.getRawValue().email.trim();
    try {
      await this.session.forgotPasswordStart(this.email);
      this.stage.set({ kind: 'otp' });
    } catch (error) {
      this.fail(error);
    } finally {
      this.submitting.set(false);
    }
  }

  protected async submitOtp(): Promise<void> {
    this.otpControl.markAsTouched();
    if (this.otpControl.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      this.resetToken = await this.session.forgotPasswordVerify(this.email, this.otpControl.value);
      this.stage.set({ kind: 'new-password' });
    } catch (error) {
      this.otpControl.reset();
      this.fail(error);
    } finally {
      this.submitting.set(false);
    }
  }

  protected async submitNewPassword(): Promise<void> {
    if (this.newPasswordForm.invalid || this.submitting()) {
      this.newPasswordForm.markAllAsTouched();
      return;
    }
    const { newPassword, confirmNewPassword } = this.newPasswordForm.getRawValue();
    if (newPassword !== confirmNewPassword) {
      this.error.set({
        title: 'Revisa los datos',
        description: 'Las contraseñas no coinciden.',
        action: 'fix-fields',
        fieldErrors: {},
        providerUnavailable: false,
        source: { status: 422, code: 'validation_error', message: 'Las contraseñas no coinciden.', details: null },
      });
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.session.forgotPasswordReset(this.resetToken, newPassword, confirmNewPassword);
      this.stage.set({ kind: 'done' });
    } catch (error) {
      this.fail(error);
    } finally {
      this.submitting.set(false);
    }
  }

  protected newPasswordFieldError(name: 'newPassword' | 'confirmNewPassword'): string | null {
    const control = this.newPasswordForm.controls[name];
    if (!control.invalid || !control.touched) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (control.hasError('minlength')) {
      return 'Debe tener al menos 12 caracteres.';
    }
    return 'Valor inválido.';
  }

  protected goToSignIn(): void {
    void this.router.navigateByUrl('/ingresar');
  }

  private fail(error: unknown): void {
    this.error.set(mapApiError(toApiError(error)));
    queueMicrotask(() => this.errorSummary()?.nativeElement.focus());
  }
}
