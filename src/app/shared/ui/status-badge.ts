import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatusTone = 'attention' | 'success' | 'critical' | 'progress' | 'neutral';

/** Estado con palabra + forma: nunca solo color (DESIGN.md > La regla del estado con palabra). */
@Component({
  selector: 'au-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"badge badge--" + tone()', '[attr.title]': 'technicalValue() || null' },
  template: `<span class="mark" aria-hidden="true"></span><span>{{ label() }}</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px 2px 8px;
      border-radius: var(--au-radius-pill);
      font-size: var(--au-fs-label);
      font-weight: 500;
      line-height: 1.5;
      white-space: nowrap;
      border: 1px solid transparent;
    }
    .mark {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      flex: none;
    }
    :host(.badge--attention) {
      background: var(--au-attention);
      color: var(--au-text-warm);
    }
    :host(.badge--success) {
      background: var(--au-mint-soft);
      color: var(--au-success-text);
    }
    :host(.badge--critical) {
      background: var(--au-canvas);
      color: var(--au-critical-text);
      border-color: var(--au-critical);
    }
    :host(.badge--critical) .mark {
      background: var(--au-critical);
    }
    :host(.badge--neutral) {
      background: var(--au-surface-sunken);
      color: var(--au-text-body);
    }
    :host(.badge--neutral) .mark {
      background: transparent;
      box-shadow: inset 0 0 0 1.5px var(--au-text-muted);
    }
    :host(.badge--progress) {
      background: var(--au-surface-sunken);
      color: var(--au-primary);
    }
    :host(.badge--progress) .mark {
      animation: pulse 1.6s var(--au-ease-out) infinite;
    }
    @keyframes pulse {
      50% {
        opacity: 0.35;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host(.badge--progress) .mark {
        animation: none;
      }
    }
  `,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input.required<StatusTone>();
  /** Valor crudo del backend, disponible como ayuda contextual. */
  readonly technicalValue = input<string | null>(null);
}
