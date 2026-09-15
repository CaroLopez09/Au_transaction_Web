import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Logotipo oficial AU, extraído sin modificar de AU Brand.pdf (página "Logotipo").
 * `on-dark` usa la versión clara; `on-light` la versión tinta. Nunca recolorear ni deformar.
 * Área de seguridad (Brand): la altura de la base a la línea media de la A, ≈ 45 % de la altura
 * del logotipo. Quien lo coloca deja al menos ese margen libre alrededor.
 */
@Component({
  selector: 'au-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<img [src]="src()" alt="AU" [style.height.px]="height()" />`,
  styles: `
    :host {
      display: inline-flex;
    }
    img {
      display: block;
      width: auto;
    }
  `,
})
export class AuLogo {
  readonly tone = input<'on-dark' | 'on-light'>('on-light');
  readonly height = input(24);
  protected readonly src = computed(() =>
    this.tone() === 'on-dark' ? 'brand/au-logo-light.svg' : 'brand/au-logo-ink.svg',
  );
}
