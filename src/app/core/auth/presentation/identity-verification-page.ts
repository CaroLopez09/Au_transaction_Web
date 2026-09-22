import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../http/api-error';
import { mapApiError } from '../../http/error-mapping';
import { SessionStore } from '../session.store';
import { FaceCapture } from './face-capture';

type ImageKey = 'front' | 'back' | 'selfie';

@Component({
  selector: 'au-identity-verification-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, FaceCapture],
  template: `
    <main class="identity">
      <section aria-labelledby="identity-title">
        <p class="eyebrow">Acceso protegido</p>
        <h1 id="identity-title">Verifica tu identidad</h1>
        <p>Confirma el documento y una imagen actual de tu rostro antes de acceder al portal.</p>
        @if (!challenge()) {
          <p class="error">La solicitud expiró. Ingresa nuevamente para obtener una nueva.</p>
          <a class="au-button au-button--primary" routerLink="/ingresar">Ir a ingresar</a>
        } @else if (result(); as response) {
          <p class="notice" role="status">Resultado: {{ response.status }}.</p>
          @if (response.status === 'REJECTED') {
            <p class="error">No pudimos validar tu identidad. Puedes intentar de nuevo con una nueva foto.</p>
            <button type="button" class="au-button au-button--secondary" (click)="retry()">Intentar de nuevo</button>
          } @else {
            <a class="au-button au-button--primary" routerLink="/ingresar">Ingresar</a>
          }
        } @else {
          <form [formGroup]="form" novalidate>
            <label class="au-label" for="front">Documento - frente</label>
            <input id="front" type="file" accept="image/jpeg,image/png" capture="environment" (change)="file('front', $event)" />
            <label class="au-label" for="back">Documento - reverso</label>
            <input id="back" type="file" accept="image/jpeg,image/png" capture="environment" (change)="file('back', $event)" />
            <label class="au-label" for="document-type">Tipo de documento</label>
            <input id="document-type" class="au-input" formControlName="documentType" />
            <label class="au-label" for="country">País emisor</label>
            <input id="country" class="au-input" formControlName="countryCode" maxlength="3" />
            <label class="consent"><input type="checkbox" formControlName="consent" /> Autorizo el tratamiento de mis datos biométricos.</label>
            <p class="au-label" id="selfie-label">Rostro</p>
            @if (canCapture()) {
              <au-face-capture aria-labelledby="selfie-label" (captured)="onSelfieCaptured($event)" />
            } @else {
              <p class="hint">Sube el documento (frente y reverso) y acepta el consentimiento para activar la cámara.</p>
            }
            @if (busy()) { <p class="notice" role="status">Validando tu identidad…</p> }
            @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
          </form>
        }
      </section>
    </main>
  `,
  styles: `.identity { max-width: 38rem; margin: 4rem auto; padding: 0 1.5rem; } form { display: grid; gap: .75rem; } h1 { margin: .25rem 0; } .eyebrow { color: var(--au-text-muted); } .consent { margin: .75rem 0; } .hint { color: var(--au-text-muted); font-size: .9rem; } .error { color: var(--au-critical, #b3261e); } .notice { color: var(--au-success, #216e39); }`,
})
export class IdentityVerificationPage {
  private readonly session = inject(SessionStore);
  protected readonly challenge = this.session.identityChallenge;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    documentType: ['CC', Validators.required], countryCode: ['CO', [Validators.required, Validators.minLength(2)]], consent: [false, Validators.requiredTrue],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<{ status: string } | null>(null);
  private readonly images = signal<Partial<Record<ImageKey, File>>>({});

  private readonly consentChecked = toSignal(this.form.controls.consent.valueChanges, {
    initialValue: this.form.controls.consent.value,
  });
  protected readonly canCapture = computed(
    () => !!this.images().front && !!this.images().back && this.consentChecked(),
  );

  protected file(key: ImageKey, event: Event): void {
    const selected = (event.target as HTMLInputElement).files?.item(0);
    if (selected) this.images.update((images) => ({ ...images, [key]: selected }));
  }

  protected retry(): void {
    this.result.set(null);
    this.error.set(null);
  }

  protected onSelfieCaptured(selfie: File): void {
    this.images.update((images) => ({ ...images, selfie }));
    void this.submit();
  }

  private async submit(): Promise<void> {
    const images = this.images();
    if (this.form.invalid || !images.front || !images.back || !images.selfie || this.busy()) {
      this.form.markAllAsTouched();
      this.error.set('Adjunta las imágenes del documento, acepta el consentimiento y captura tu rostro.');
      return;
    }
    this.busy.set(true); this.error.set(null);
    try {
      const { documentType, countryCode, consent } = this.form.getRawValue();
      const response = await this.session.completeIdentity({
        documentFrontImage: images.front,
        documentBackImage: images.back,
        selfieImage: images.selfie,
        documentType,
        countryCode,
        biometricConsent: consent,
      });
      this.result.set(response);
    } catch (error) {
      // El BFF reenvia el motivo real del proveedor biometrico (p. ej. "no se detecto un rostro")
      // en `message` de un business_rule_violation: mostrarlo tal cual, no un mensaje generico.
      const apiError = toApiError(error);
      this.error.set(apiError.message ?? mapApiError(apiError).description);
    }
    finally { this.busy.set(false); }
  }
}