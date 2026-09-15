import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Country, CountryRepository } from './country';

/**
 * País en ISO-3 (alfa-3). Con el catálogo del proveedor disponible es un selector; si no responde
 * (hoy, sin credenciales) acepta el código de tres letras, que es lo que valida el backend.
 */
@Component({
  selector: 'au-country-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    @if (countries(); as list) {
      <select
        class="au-input"
        [id]="inputId()"
        [formControl]="control()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
      >
        <option value="">Selecciona un país</option>
        @for (country of list; track country.alpha3) {
          <option [value]="country.alpha3">{{ country.name }}</option>
        }
      </select>
    } @else {
      <input
        class="au-input code"
        [id]="inputId()"
        [formControl]="control()"
        maxlength="3"
        autocapitalize="characters"
        autocomplete="off"
        spellcheck="false"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy() ?? inputId() + '-hint'"
      />
      <p class="au-help" [id]="inputId() + '-hint'">Código ISO de tres letras (COL, USA, MEX).</p>
    }
  `,
  styles: `
    .code {
      max-width: 120px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
  `,
})
export class CountryInput implements OnInit {
  readonly control = input.required<FormControl<string>>();
  readonly inputId = input.required<string>();
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);

  private readonly repository = inject(CountryRepository);
  protected readonly countries = signal<readonly Country[] | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const list = await firstValueFrom(this.repository.countries());
      this.countries.set(list.length ? list : null);
    } catch {
      this.countries.set(null);
    }
  }
}
