import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Icon } from './icon';

/** Copia un dato (routing, número de cuenta) con confirmación accesible. */
@Component({
  selector: 'au-copy-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button type="button" class="au-button au-button--quiet" [attr.aria-label]="'Copiar ' + label()" (click)="copy()">
      <au-icon [name]="copied() ? 'check' : 'copy'" [size]="16" />
      {{ copied() ? 'Copiado' : 'Copiar' }}
    </button>
    <span class="au-visually-hidden" aria-live="polite">{{ copied() ? label() + ' copiado' : '' }}</span>
  `,
})
export class CopyButton {
  readonly value = input.required<string>();
  readonly label = input.required<string>();
  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.value());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.copied.set(false);
    }
  }
}
