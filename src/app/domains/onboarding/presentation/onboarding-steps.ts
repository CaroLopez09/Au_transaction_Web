import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../../shared/ui/icon';
import { OnboardingStep } from '../domain/onboarding-progress';

const STATE_LABEL = {
  done: 'completado',
  current: 'paso actual',
  upcoming: 'pendiente',
  blocked: 'detenido',
} as const;

@Component({
  selector: 'au-onboarding-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <ol>
      @for (step of steps(); track step.key) {
        <li [class]="step.state" [attr.aria-current]="step.state === 'current' ? 'step' : null">
          <span class="marker" aria-hidden="true">
            @switch (step.state) {
              @case ('done') {
                <au-icon name="check" [size]="14" />
              }
              @case ('blocked') {
                <au-icon name="close" [size]="14" />
              }
            }
          </span>
          <span class="title">{{ step.title }}</span>
          <span class="au-visually-hidden">, {{ stateLabel[step.state] }}</span>
        </li>
      }
    </ol>
  `,
  styles: `
    ol {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0;
    }
    li {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--au-space-3);
      min-height: 44px;
      color: var(--au-text-muted);
    }
    li:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 11px;
      top: calc(50% + 13px);
      height: calc(100% - 26px);
      width: 1px;
      background: var(--au-hairline);
    }
    li.done:not(:last-child)::after {
      background: var(--au-mint);
    }
    .marker {
      display: grid;
      place-items: center;
      width: 23px;
      height: 23px;
      flex: none;
      border-radius: 50%;
      border: 1.5px solid var(--au-border-control);
      background: var(--au-canvas);
      transition:
        background-color var(--au-dur-base) var(--au-ease-out),
        border-color var(--au-dur-base) var(--au-ease-out);
    }
    .done {
      color: var(--au-text-body);
    }
    .done .marker {
      background: var(--au-mint-soft);
      border-color: var(--au-success-text);
      color: var(--au-success-text);
    }
    .current {
      color: var(--au-primary);
      font-weight: 500;
    }
    .current .marker {
      border: 6px solid var(--au-primary);
    }
    .blocked {
      color: var(--au-critical-text);
      font-weight: 500;
    }
    .blocked .marker {
      border-color: var(--au-critical);
      color: var(--au-critical-text);
    }
  `,
})
export class OnboardingSteps {
  readonly steps = input.required<readonly OnboardingStep[]>();
  protected readonly stateLabel = STATE_LABEL;
}
