import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon';

/** Lo que falta para completar un paso. No bloquea guardar: es una guía. */
@Component({
  selector: 'au-step-gaps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (gaps().length === 0 && pending().length === 0) {
      <p class="done" role="status"><au-icon name="check" [size]="16" /> {{ doneLabel() }}</p>
    } @else {
      <div class="gaps" role="status">
        @if (gaps().length) {
          <p class="title">Para completar este paso falta:</p>
          <ul>
            @for (gap of gaps(); track gap) {
              <li>{{ gap }}</li>
            }
          </ul>
        }
        @if (pending().length) {
          <p class="title">El proveedor todavía pide:</p>
          <ul>
            @for (field of pending(); track field) {
              <li class="au-mono">{{ field }}</li>
            }
          </ul>
        }
      </div>
    }
  `,
  styles: `
    .done {
      display: flex;
      align-items: center;
      gap: var(--au-space-2);
      color: var(--au-success-text);
      font-size: var(--au-fs-data);
      font-weight: 500;
    }
    .gaps {
      padding: var(--au-space-4);
      border-radius: var(--au-radius-sm);
      background: var(--au-canvas-ledger);
      color: var(--au-text-warm);
      font-size: var(--au-fs-data);
    }
    .title {
      font-weight: 500;
    }
    .title + ul {
      margin: var(--au-space-1) 0 0;
      padding-left: var(--au-space-5);
    }
    ul + .title {
      margin-top: var(--au-space-3);
    }
  `,
})
export class StepGaps {
  readonly gaps = input.required<readonly string[]>();
  readonly pending = input<readonly string[]>([]);
  readonly doneLabel = input('Paso completo.');
}
