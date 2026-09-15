import { ChangeDetectionStrategy, Component, model } from '@angular/core';

/**
 * Casilla de consentimiento o aceptación. El texto va proyectado para admitir enlaces.
 * La constancia la guarda el BFF al recibir la acción, no esta casilla.
 */
@Component({
  selector: 'au-consent-check',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="consent">
      <input type="checkbox" [checked]="checked()" (change)="checked.set($any($event.target).checked)" />
      <span><ng-content /></span>
    </label>
  `,
  styles: `
    .consent {
      display: flex;
      align-items: flex-start;
      gap: var(--au-space-3);
      max-width: 68ch;
      min-height: 44px;
      padding: var(--au-space-2) 0;
      color: var(--au-text-body);
      cursor: pointer;
    }
    input {
      flex: none;
      width: 18px;
      height: 18px;
      margin-top: 2px;
      accent-color: var(--au-primary);
    }
  `,
})
export class ConsentCheck {
  readonly checked = model(false);
}
