import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UserFacingError } from '../../core/http/error-mapping';
import { Icon } from './icon';

/** Qué pasó · qué significa · qué hacer. "Pendiente de configuración" no se presenta como fallo. */
@Component({
  selector: 'au-error-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { role: 'alert', '[class.provider]': 'error().providerUnavailable' },
  template: `
    <au-icon [name]="error().providerUnavailable ? 'clock' : 'alert'" [size]="20" class="icon" />
    <div class="body">
      <h2>{{ error().title }}</h2>
      <p>{{ error().description }}</p>
      @if (error().action === 'retry' || error().action === 'wait') {
        <button type="button" class="au-button au-button--secondary" (click)="retry.emit()">Reintentar</button>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      gap: var(--au-space-3);
      padding: var(--au-space-5);
      border: 1px solid var(--au-hairline);
      border-radius: var(--au-radius-md);
      background: var(--au-canvas);
    }
    .icon {
      color: var(--au-critical);
      margin-top: 2px;
    }
    :host(.provider) .icon {
      color: var(--au-text-muted);
    }
    h2 {
      font-size: var(--au-fs-body);
      font-weight: 500;
    }
    p {
      margin-top: var(--au-space-1);
      color: var(--au-text-body);
      max-width: 60ch;
    }
    button {
      margin-top: var(--au-space-4);
    }
  `,
})
export class ErrorState {
  readonly error = input.required<UserFacingError>();
  readonly retry = output<void>();
}
