import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
  effect,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toDataURL } from 'qrcode';
import { MfaEnrollment } from '../session.repository';

/**
 * Muestra el QR y el secreto de la app autenticadora y pide el primer código.
 *
 * El QR se genera en el navegador a partir de `otpauthUri` y vive solo en memoria de este
 * componente: nunca se guarda en almacenamiento, en el borrador ni en registros.
 */
@Component({
  selector: 'au-mfa-enrollment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <ol class="steps">
      <li>Abre tu app autenticadora (Google Authenticator, Microsoft Authenticator u otra).</li>
      <li>Escanea este código o escribe la clave a mano.</li>
    </ol>
    @if (qr(); as image) {
      <img class="qr" [src]="image" width="192" height="192" alt="Código QR para la app autenticadora" />
    }
    <p class="au-help">Clave para escribir a mano:</p>
    <p class="secret au-mono" aria-label="Clave secreta">{{ grouped(enrollment().secret) }}</p>
    <div class="au-field">
      <label class="au-label" for="mfa-setup-code">3. Escribe el código de 6 dígitos que muestra la app</label>
      <input
        #codeInput
        id="mfa-setup-code"
        class="au-input au-num code"
        [formControl]="code"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        [attr.aria-invalid]="code.invalid && code.touched"
      />
    </div>
    <button
      type="button"
      class="au-button au-button--primary au-button--block"
      [disabled]="busy()"
      (click)="submit()"
    >
      {{ busy() ? 'Confirmando…' : 'Activar segundo factor' }}
    </button>
  `,
  styles: `
    .steps {
      margin: 0 0 var(--au-space-3);
      padding-left: 1.2rem;
    }
    .qr {
      display: block;
      margin: var(--au-space-3) auto;
      border-radius: var(--au-radius-sm, 6px);
      background: #fff;
    }
    .secret {
      word-break: break-all;
      letter-spacing: 0.08em;
      margin-bottom: var(--au-space-4);
    }
    .code {
      letter-spacing: 0.3em;
      font-size: 1.25rem;
    }
  `,
})
export class MfaEnrollmentPanel implements OnDestroy {
  readonly enrollment = input.required<MfaEnrollment>();
  readonly busy = input(false);
  readonly confirmed = output<string>();

  protected readonly qr = signal<string | null>(null);
  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });
  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  constructor() {
    effect(() => {
      const uri = this.enrollment().otpauthUri;
      toDataURL(uri, { margin: 1, width: 192, errorCorrectionLevel: 'M' })
        .then((image) => this.qr.set(image))
        .catch(() => this.qr.set(null));
    });
  }

  protected grouped(secret: string): string {
    return secret.replace(/(.{4})/g, '$1 ').trim();
  }

  protected submit(): void {
    this.code.markAsTouched();
    if (this.code.invalid) {
      this.codeInput()?.nativeElement.focus();
      return;
    }
    this.confirmed.emit(this.code.value);
  }

  ngOnDestroy(): void {
    this.qr.set(null);
  }
}
