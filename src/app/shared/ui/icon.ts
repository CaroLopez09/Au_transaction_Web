import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Set propio de iconos: trazo 1.5 px, retícula 24, extremos redondeados. */
const ICONS = {
  home: 'M3.5 10.5 12 4l8.5 6.5M5.5 9v10.5h13V9M10 19.5v-5h4v5',
  onboarding: 'M4 7.5h16v12H4zM9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M4 12.5h16M11 12.5v1.5h2v-1.5',
  'sign-out': 'M14 4.5h4.5v15H14M10.5 16l4-4-4-4M14.5 12H4',
  refresh: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 4.5 20.5 19h-17zM12 10v4M12 16.8v.2',
  clock: 'M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM12 8v4.5l3 2',
  person: 'M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 19.5c.8-3.2 3.6-5 7-5s6.2 1.8 7 5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  'arrow-right': 'M5 12h14M13.5 6.5 19 12l-5.5 5.5',
  'external-link': 'M13.5 4.5h6v6M19.5 4.5l-8 8M17 13.5v6H4.5V7H10.5',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  'eye-off':
    'M4 4l16 16M10 6c.6-.2 1.3-.3 2-.3 6 0 9.5 6.3 9.5 6.3a17 17 0 0 1-2.9 3.6M6.5 7.6A17 17 0 0 0 2.5 12s3.5 6.5 9.5 6.5c1.5 0 2.9-.4 4.1-1M10.2 10.2a2.5 2.5 0 0 0 3.6 3.6',
  pending: 'M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z',
  copy: 'M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4',
  accounts: 'M3.5 9.5 12 4.5l8.5 5M5 9.5v8M9.5 9.5v8M14.5 9.5v8M19 9.5v8M3.5 19.5h17',
  deposits: 'M12 4.5v11M7.5 11l4.5 4.5 4.5-4.5M4.5 19.5h15',
  recipients: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19c.7-2.9 2.8-4.5 5.5-4.5s4.8 1.6 5.5 4.5M16 8.5h5M18.5 6v5',
  payouts: 'M12 19.5v-11M7.5 13l4.5-4.5 4.5 4.5M4.5 4.5h15',
  rfis: 'M5.5 3.5h9l4 4v13h-13zM14.5 3.5v4h4M9 12h6M9 15.5h6',
  history: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4M12 8v4.5l3 2',
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'au-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'au-icon' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" focusable="false">
      <path [attr.d]="path()" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      line-height: 0;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(18);
  protected readonly path = computed(() => ICONS[this.name()]);
}
