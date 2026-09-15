import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'au-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text">
      <h1>{{ title() }}</h1>
      @if (description()) {
        <p>{{ description() }}</p>
      }
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--au-space-4) var(--au-space-6);
      padding-bottom: var(--au-space-5);
      margin-bottom: var(--au-space-8);
      border-bottom: 1px solid var(--au-mint);
    }
    h1 {
      font-size: var(--au-fs-page);
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    p {
      margin-top: var(--au-space-2);
      max-width: 64ch;
      color: var(--au-text-muted);
    }
    .actions {
      display: flex;
      gap: var(--au-space-2);
    }
    .actions:empty {
      display: none;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
