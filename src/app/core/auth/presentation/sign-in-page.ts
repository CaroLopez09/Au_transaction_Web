import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toApiError } from '../../http/api-error';
import { mapApiError, UserFacingError } from '../../http/error-mapping';
import { AuLogo } from '../../../shared/ui/au-logo';
import { Icon } from '../../../shared/ui/icon';
import { safeReturnUrl } from '../auth.guards';
import { SessionStore } from '../session.store';

@Component({
  selector: 'au-sign-in-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AuLogo, Icon],
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
      await this.session.signIn(email.trim(), password);
      await this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('volver')));
    } catch (error) {
      this.error.set(mapApiError(toApiError(error)));
      this.form.controls.password.reset();
      queueMicrotask(() => this.errorSummary()?.nativeElement.focus());
    } finally {
      this.submitting.set(false);
    }
  }
}
