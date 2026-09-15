import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CountryInput } from '../../../../shared/reference/country-input';
import { BUSINESS_TYPES, INDUSTRIES } from '../../domain/kyb-catalog';
import { CompanySection, companyGaps, E164_PATTERN, ISO_ALPHA3, isInternational } from '../../domain/onboarding-draft';
import { StepGaps } from './step-gaps';

@Component({
  selector: 'au-company-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CountryInput, StepGaps],
  template: `
    <form [formGroup]="form" (submit)="$event.preventDefault()">
      <fieldset class="group">
        <legend>Identificación</legend>
        <div class="au-field">
          <label class="au-label" for="business_legal_name">Razón social</label>
          <input
            id="business_legal_name"
            class="au-input"
            formControlName="business_legal_name"
            autocomplete="organization"
          />
        </div>
        <div class="pair">
          <div class="au-field">
            <label class="au-label" for="business_trade_name"
              >Nombre comercial <span class="au-optional">(si es distinto)</span></label
            >
            <input id="business_trade_name" class="au-input" formControlName="business_trade_name" />
          </div>
          <div class="au-field">
            <label class="au-label" for="business_type">Tipo de sociedad</label>
            <select id="business_type" class="au-input" formControlName="business_type">
              <option value="">Selecciona</option>
              @for (option of businessTypes; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
        </div>
        <div class="au-field">
          <label class="au-label" for="business_description"
            >Descripción de la actividad <span class="au-optional">(opcional)</span></label
          >
          <textarea
            id="business_description"
            class="au-input"
            rows="3"
            formControlName="business_description"
          ></textarea>
        </div>
      </fieldset>

      <fieldset class="group">
        <legend>Actividad e identificación tributaria</legend>
        <div class="au-field">
          <label class="au-label" for="business_industry">Industria</label>
          <select
            id="business_industry"
            class="au-input"
            formControlName="business_industry"
            aria-describedby="industry-help"
          >
            <option value="">Selecciona</option>
            @for (option of industries; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
          <p class="au-help" id="industry-help">La principal. El proveedor evalúa la solicitud según la industria.</p>
        </div>
        <div class="pair">
          <div class="au-field">
            <label class="au-label" for="document_number">Identificador tributario</label>
            <input
              id="document_number"
              class="au-input au-num"
              formControlName="document_number"
              autocomplete="off"
              spellcheck="false"
              aria-describedby="document-number-help"
            />
            <p class="au-help" id="document-number-help">NIT, RFC, CNPJ, EIN… tal como figura en el registro.</p>
          </div>
          <div class="au-field">
            <label class="au-label" for="document_country">País que lo emite</label>
            <au-country-input
              [control]="form.controls.document_country"
              inputId="document_country"
              [invalid]="showError('document_country')"
            />
          </div>
        </div>
        @if (international()) {
          <div class="au-field">
            <label class="au-label" for="international_entity_type">Tipo de entidad en su país</label>
            <input
              id="international_entity_type"
              class="au-input"
              formControlName="international_entity_type"
              aria-describedby="entity-type-help"
            />
            <p class="au-help" id="entity-type-help">
              Por ejemplo «Sociedad por acciones simplificada (SAS)». El proveedor lo pide a empresas constituidas fuera
              de EE. UU.
            </p>
          </div>
        }
      </fieldset>

      <fieldset class="group">
        <legend>Contacto</legend>
        <div class="pair">
          <div class="au-field">
            <label class="au-label" for="company_email">Correo de la empresa</label>
            <input
              id="company_email"
              class="au-input"
              type="email"
              formControlName="email"
              autocomplete="email"
              [attr.aria-invalid]="showError('email')"
              [attr.aria-describedby]="showError('email') ? 'company_email-error' : null"
            />
            @if (showError('email')) {
              <p class="au-field-error" id="company_email-error">Escribe un correo válido.</p>
            }
          </div>
          <div class="au-field">
            <label class="au-label" for="phone">Teléfono <span class="au-optional">(opcional)</span></label>
            <input
              id="phone"
              class="au-input"
              type="tel"
              formControlName="phone"
              autocomplete="tel"
              placeholder="+573001234567"
              aria-describedby="phone-help"
              [attr.aria-invalid]="showError('phone')"
            />
            <p class="au-help" id="phone-help">Formato internacional: + código de país y número, sin espacios.</p>
            @if (showError('phone')) {
              <p class="au-field-error">El teléfono debe empezar por + y tener solo dígitos.</p>
            }
          </div>
        </div>
        <div class="au-field">
          <label class="au-label" for="business_website">Sitio web <span class="au-optional">(opcional)</span></label>
          <input
            id="business_website"
            class="au-input"
            type="url"
            formControlName="business_website"
            placeholder="https://"
          />
        </div>
      </fieldset>

      <fieldset class="group">
        <legend>Constitución</legend>
        <div class="pair">
          <div class="au-field">
            <label class="au-label" for="formation_date">Fecha de constitución</label>
            <input id="formation_date" class="au-input short" type="date" formControlName="formation_date" />
          </div>
          <div class="au-field">
            <label class="au-label" for="formation_country">País de constitución</label>
            <au-country-input
              [control]="form.controls.formation_country"
              inputId="formation_country"
              [invalid]="showError('formation_country')"
            />
          </div>
        </div>
        <div class="au-field">
          <label class="au-label" for="formation_state"
            >Estado o departamento de constitución <span class="au-optional">(opcional)</span></label
          >
          <input id="formation_state" class="au-input" formControlName="formation_state" />
        </div>
      </fieldset>

      <fieldset class="group" [formGroup]="form.controls.registered_address">
        <legend>Dirección registrada</legend>
        <div class="au-field">
          <label class="au-label" for="street_line_1">Dirección</label>
          <input id="street_line_1" class="au-input" formControlName="street_line_1" autocomplete="address-line1" />
        </div>
        <div class="au-field">
          <label class="au-label" for="street_line_2">Complemento <span class="au-optional">(opcional)</span></label>
          <input id="street_line_2" class="au-input" formControlName="street_line_2" autocomplete="address-line2" />
        </div>
        <div class="pair">
          <div class="au-field">
            <label class="au-label" for="city">Ciudad</label>
            <input id="city" class="au-input" formControlName="city" autocomplete="address-level2" />
          </div>
          <div class="au-field">
            <label class="au-label" for="subdivision">Estado o departamento</label>
            <input id="subdivision" class="au-input" formControlName="subdivision" autocomplete="address-level1" />
          </div>
        </div>
        <div class="pair">
          <div class="au-field">
            <label class="au-label" for="postal_code">Código postal <span class="au-optional">(opcional)</span></label>
            <input id="postal_code" class="au-input short" formControlName="postal_code" autocomplete="postal-code" />
          </div>
          <div class="au-field">
            <label class="au-label" for="address_country">País</label>
            <au-country-input [control]="form.controls.registered_address.controls.country" inputId="address_country" />
          </div>
        </div>
      </fieldset>
    </form>
    <au-step-gaps [gaps]="gaps()" [pending]="pending()" />
  `,
  styleUrl: './wizard-step.css',
})
export class CompanyStep {
  readonly value = input.required<CompanySection>();
  readonly readonly = input(false);
  readonly pending = input<readonly string[]>([]);
  readonly changed = output<CompanySection>();

  protected readonly businessTypes = BUSINESS_TYPES;
  protected readonly industries = INDUSTRIES;
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    business_legal_name: [''],
    email: ['', Validators.email],
    business_type: [''],
    business_trade_name: [''],
    business_description: [''],
    business_website: [''],
    phone: ['', Validators.pattern(E164_PATTERN)],
    formation_date: [''],
    formation_country: ['', Validators.pattern(ISO_ALPHA3)],
    formation_state: [''],
    business_industry: [''],
    document_number: [''],
    document_country: ['', Validators.pattern(ISO_ALPHA3)],
    international_entity_type: [''],
    registered_address: this.fb.group({
      street_line_1: [''],
      street_line_2: [''],
      city: [''],
      subdivision: [''],
      postal_code: [''],
      country: ['', Validators.pattern(ISO_ALPHA3)],
    }),
  });
  protected readonly gaps = computed(() => companyGaps(this.value()));
  protected readonly international = computed(() => isInternational(this.value()));

  constructor() {
    // Carga inicial y cuando llega otro borrador (sin reescribir lo que la persona está tecleando).
    effect(() => {
      const value = this.value();
      untracked(() => {
        if (JSON.stringify(this.form.getRawValue()) !== JSON.stringify(value)) {
          this.form.setValue(value, { emitEvent: false });
        }
      });
    });
    effect(() => (this.readonly() ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false })));
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.changed.emit(this.form.getRawValue()));
  }

  protected showError(name: 'email' | 'phone' | 'formation_country' | 'document_country'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched && !!control.value;
  }
}
