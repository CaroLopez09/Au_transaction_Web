import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'au-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[style.width]': 'width()', '[style.height]': 'height()' },
  template: '',
  styles: `
    :host {
      display: block;
      border-radius: var(--au-radius-sm);
      background: linear-gradient(
        90deg,
        var(--au-surface-sunken) 0%,
        var(--au-hairline) 50%,
        var(--au-surface-sunken) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.6s linear infinite;
    }
    @keyframes shimmer {
      to {
        background-position: -200% 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
      }
    }
  `,
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('16px');
}
