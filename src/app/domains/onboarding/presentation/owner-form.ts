import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { UserFacingError } from '../../../core/http/error-mapping';
import { Icon } from '../../../shared/ui/icon';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Country, CountryRepository, ISO_ALPHA3_PATTERN } from '../../../shared/reference/country';
import { OnboardingFacade } from '../application/onboarding.facade';
import {
  BENEFICIAL_OWNER_THRESHOLD,
  BeneficialOwner,
  Gender,
  qualifiesAsBeneficialOwner,
  SaveBeneficialOwner,
} from '../domain/beneficial-owner';
import { PERSON_ID_TYPES } from '../domain/kyb-catalog';
import { E164_PATTERN } from '../domain/onboarding-draft';

type CatalogState =
  { status: 'loading' } | { status: 'available'; countries: readonly Country[] } | { status: 'unavailable' };

/** Nombres de campo del BFF (UboCommands.SaveUbo): así se enlazan los `details` de un 400. */
type FieldName =
  | 'firstName'
  | 'lastName'
  | 'roleInCompany'
  | 'email'
  | 'hasOwnership'
  | 'ownershipPercentage'
  | 'hasControl'
  | 'isSigner'
  | 'politicallyExposed'
  | 'countryOfBirth'
  | 'documentType'
  | 'documentNumber'
  | 'documentCountry'
  | 'birthDate'
  | 'nationality'
  | 'occupation'
  | 'gender'
  | 'phoneNumber'
  | 'addressStreet'
  | 'addressCity'
  | 'addressState'
  | 'addressPostalCode'
  | 'addressCountry';

type CountryField = 'countryOfBirth' | 'nationality' | 'documentCountry' | 'addressCountry';

const ISO3_MESSAGE = 'Usa el código ISO de tres letras, por ejemplo COL.';

const CLIENT_MESSAGES: Record<FieldName, Partial<Record<string, string>>> = {
  firstName: { required: 'Escribe el nombre.' },
  lastName: { required: 'Escribe el apellido.' },
  roleInCompany: {},
  email: { email: 'Escribe un correo válido.' },
  hasOwnership: { required: 'Indica si la persona tiene participación en la empresa.' },
  ownershipPercentage: {
    required: 'Escribe el porcentaje de participación.',
    min: 'El porcentaje debe estar entre 0 y 100.',
    max: 'El porcentaje debe estar entre 0 y 100.',
    decimals: 'Usa como máximo dos decimales.',
  },
  hasControl: { required: 'Indica si la persona ejerce control sobre la empresa.' },
  isSigner: { required: 'Indica si la persona firma en nombre de la empresa.' },
  politicallyExposed: { required: 'Indica si la persona está expuesta políticamente.' },
  countryOfBirth: {
    required: 'Indica el país de nacimiento.',
    pattern: 'Usa el código ISO de tres letras, por ejemplo COL.',
  },
  documentType: {},
  documentNumber: {},
  documentCountry: { pattern: ISO3_MESSAGE },
  birthDate: { future: 'La fecha de nacimiento no puede ser futura.' },
  nationality: { pattern: ISO3_MESSAGE },
  occupation: { maxlength: 'Máximo 100 caracteres.' },
  gender: {},
  phoneNumber: { pattern: 'Usa el formato internacional, por ejemplo +573001234567.' },
  addressStreet: {},
  addressCity: {},
  addressState: {},
  addressPostalCode: {},
  addressCountry: { pattern: ISO3_MESSAGE },
};

/** @Past del BFF. */
function notInFuture(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value;
  return !value || value <= new Date().toISOString().slice(0, 10) ? null : { future: true };
}

function requiredWhen(required: () => boolean): ValidatorFn {
  return (control) => (required() && !String(control.value ?? '').trim() ? { required: true } : null);
}

/** @DecimalMax("100.00") del BFF: dos decimales. */
function twoDecimals(control: AbstractControl<number | null>): ValidationErrors | null {
  const value = control.value;
  return value === null || Math.abs(value * 100 - Math.round(value * 100)) < 1e-6 ? null : { decimals: true };
}

function toKiraField(name: 'birthDate' | 'nationality' | 'documentNumber'): string {
  return name === 'birthDate' ? 'birth_date' : name === 'documentNumber' ? 'document_number' : name;
}

@Component({
  selector: 'au-owner-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgTemplateOutlet, Icon, Skeleton],
  templateUrl: './owner-form.html',
  styleUrl: './owner-form.css',
})
export class OwnerForm implements OnInit {
  /** `null` = alta; con beneficiario = edición. */
  readonly owner = input<BeneficialOwner | null>(null);
  readonly formId = input.required<string>();
  /** Campos por persona que Kira exige para la empresa actual. */
  readonly pending = input<readonly string[]>([]);
  readonly saved = output<BeneficialOwner>();

  private readonly facade = inject(OnboardingFacade);
  private readonly countries = inject(CountryRepository);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly errorSummary = viewChild<ElementRef<HTMLElement>>('errorSummary');

  protected readonly isUpdate = computed(() => this.owner() !== null);
  protected readonly catalog = signal<CatalogState>({ status: 'loading' });
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<UserFacingError | null>(null);
  protected readonly threshold = BENEFICIAL_OWNER_THRESHOLD;
  protected readonly idTypes = PERSON_ID_TYPES;
  protected readonly today = new Date().toISOString().slice(0, 10);

  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.group({
    firstName: this.fb.nonNullable.control('', Validators.required),
    lastName: this.fb.nonNullable.control('', Validators.required),
    roleInCompany: this.fb.nonNullable.control(''),
    email: this.fb.nonNullable.control('', Validators.email),
    hasOwnership: [null as boolean | null, Validators.required],
    ownershipPercentage: [
      null as number | null,
      [Validators.required, Validators.min(0), Validators.max(100), twoDecimals],
    ],
    hasControl: [null as boolean | null, Validators.required],
    isSigner: [null as boolean | null, Validators.required],
    politicallyExposed: [null as boolean | null, Validators.required],
    countryOfBirth: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(ISO_ALPHA3_PATTERN)]),
    documentType: this.fb.nonNullable.control(''),
    documentNumber: this.fb.nonNullable.control('', requiredWhen(() => this.requiredByProvider('documentNumber'))),
    documentCountry: this.fb.nonNullable.control('', Validators.pattern(ISO_ALPHA3_PATTERN)),
    birthDate: this.fb.nonNullable.control('', [notInFuture, requiredWhen(() => this.requiredByProvider('birthDate'))]),
    nationality: this.fb.nonNullable.control('', [
      Validators.pattern(ISO_ALPHA3_PATTERN),
      requiredWhen(() => this.requiredByProvider('nationality')),
    ]),
    occupation: this.fb.nonNullable.control('', Validators.maxLength(100)),
    gender: this.fb.nonNullable.control<Gender | ''>(''),
    phoneNumber: this.fb.nonNullable.control('', Validators.pattern(E164_PATTERN)),
    addressStreet: this.fb.nonNullable.control(''),
    addressCity: this.fb.nonNullable.control(''),
    addressState: this.fb.nonNullable.control(''),
    addressPostalCode: this.fb.nonNullable.control(''),
    addressCountry: this.fb.nonNullable.control('', Validators.pattern(ISO_ALPHA3_PATTERN)),
  });

  private readonly hasOwnership = toSignal(this.form.controls.hasOwnership.valueChanges, { initialValue: null });
  private readonly percentage = toSignal(this.form.controls.ownershipPercentage.valueChanges, {
    initialValue: null,
  });

  /** Anticipa la regla del BFF (Ubo.isBeneficialOwner) mientras se completa el formulario. */
  protected readonly beneficialOwnerHint = computed(() => {
    const hasOwnership = this.hasOwnership();
    if (hasOwnership === null) {
      return null;
    }
    return qualifiesAsBeneficialOwner(hasOwnership, this.percentage()) ? 'qualifies' : 'does-not-qualify';
  });

  constructor() {
    effect(() => {
      this.pending();
      this.form.controls.birthDate.updateValueAndValidity({ emitEvent: false });
      this.form.controls.nationality.updateValueAndValidity({ emitEvent: false });
      this.form.controls.documentNumber.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    const owner = this.owner();
    if (owner) {
      this.form.patchValue({
        firstName: owner.firstName,
        lastName: owner.lastName,
        roleInCompany: owner.roleInCompany ?? '',
        documentCountry: owner.documentCountry ?? '',
        birthDate: owner.birthDate ?? '',
        nationality: owner.nationality ?? '',
        occupation: owner.occupation ?? '',
        gender: owner.gender ?? '',
        phoneNumber: owner.phoneNumber ?? '',
        addressStreet: owner.address?.streetName ?? '',
        addressCity: owner.address?.city ?? '',
        addressState: owner.address?.state ?? '',
        addressPostalCode: owner.address?.postalCode ?? '',
        addressCountry: owner.address?.country ?? '',
        hasOwnership: owner.hasOwnership,
        ownershipPercentage: owner.ownershipPercentage,
        hasControl: owner.hasControl,
        isSigner: owner.signer,
        politicallyExposed: owner.politicallyExposed,
        countryOfBirth: owner.countryOfBirth ?? '',
        email: owner.email ?? '',
        documentType: owner.documentType ?? '',
        documentNumber: owner.documentNumber ?? '',
      });
    }
    this.syncPercentageAvailability(this.form.controls.hasOwnership.value);
    this.form.controls.hasOwnership.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.syncPercentageAvailability(value));
    void this.loadCountries();
  }

  protected countryOptions(countries: readonly Country[], field: CountryField): readonly Country[] {
    const current = this.form.controls[field].value.toUpperCase();
    if (!current || countries.some((country) => country.alpha3 === current)) {
      return countries;
    }
    // Un código ya guardado que no está en el catálogo se conserva visible en lugar de perderse.
    return [{ name: current, alpha3: current }, ...countries];
  }

  protected invalid(name: FieldName): boolean {
    const control = this.form.controls[name];
    return (control.invalid && (control.touched || this.submitted())) || !!this.serverError()?.fieldErrors[name];
  }

  protected requiredByProvider(name: 'birthDate' | 'nationality' | 'documentNumber'): boolean {
    return this.pending().includes(`associated_persons:${toKiraField(name)}`);
  }

  protected errorFor(name: FieldName): string | null {
    const server = this.serverError()?.fieldErrors[name];
    if (server) {
      return server;
    }
    const control = this.form.controls[name];
    if (!control.errors || !(control.touched || this.submitted())) {
      return null;
    }
    const key = Object.keys(control.errors)[0];
    return CLIENT_MESSAGES[name][key] ?? 'Revisa este dato.';
  }

  protected describedBy(name: FieldName, helpId?: string): string | null {
    const ids = [helpId, this.errorFor(name) ? `${this.formId()}-${name}-error` : null].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  /** Valida, guarda y emite `saved`; si el BFF rechaza, pinta sus errores y mueve el foco. */
  async submit(): Promise<void> {
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    const result = await this.facade.saveOwner(this.toCommand());
    if (!result) {
      return;
    }
    if (result.ok) {
      this.saved.emit(result.owner);
      return;
    }
    this.serverError.set(result.error);
    if (Object.keys(result.error.fieldErrors).length > 0) {
      this.focusFirstInvalid();
    } else {
      afterNextRender(() => this.errorSummary()?.nativeElement.focus(), { injector: this.injector });
    }
  }

  private toCommand(): SaveBeneficialOwner {
    const value = this.form.getRawValue();
    const text = (raw: string) => raw.trim() || null;
    return {
      id: this.owner()?.id ?? null,
      firstName: value.firstName,
      lastName: value.lastName,
      roleInCompany: text(value.roleInCompany),
      email: text(value.email),
      documentType: value.documentType || null,
      documentNumber: text(value.documentNumber),
      hasOwnership: value.hasOwnership === true,
      // Sin participación declarada el porcentaje no cuenta para el proveedor; el BFF exige un número.
      ownershipPercentage: value.hasOwnership ? (value.ownershipPercentage ?? 0) : 0,
      hasControl: value.hasControl === true,
      isSigner: value.isSigner === true,
      politicallyExposed: value.politicallyExposed === true,
      countryOfBirth: value.countryOfBirth,
      birthDate: value.birthDate || null,
      nationality: text(value.nationality),
      occupation: text(value.occupation),
      gender: value.gender || null,
      phoneNumber: text(value.phoneNumber),
      documentCountry: text(value.documentCountry),
      address: [value.addressStreet, value.addressCity, value.addressState, value.addressPostalCode, value.addressCountry]
        .some((part) => part.trim())
        ? {
            streetName: text(value.addressStreet),
            city: text(value.addressCity),
            state: text(value.addressState),
            postalCode: text(value.addressPostalCode),
            country: text(value.addressCountry),
          }
        : null,
    };
  }

  private syncPercentageAvailability(hasOwnership: boolean | null): void {
    const control = this.form.controls.ownershipPercentage;
    if (hasOwnership === false) {
      control.setValue(null);
      control.disable({ emitEvent: false });
    } else {
      control.enable({ emitEvent: false });
    }
  }

  private async loadCountries(): Promise<void> {
    try {
      const countries = await firstValueFrom(this.countries.countries());
      this.catalog.set(countries.length ? { status: 'available', countries } : { status: 'unavailable' });
    } catch {
      // Sin catálogo (hoy: proveedor no configurado) se admite el código ISO-3, que es lo que valida el BFF.
      this.catalog.set({ status: 'unavailable' });
    }
  }

  /** Tras pintar los errores, el foco va al primer campo inválido en orden de lectura. */
  private focusFirstInvalid(): void {
    afterNextRender(
      () => {
        const host = document.getElementById(this.formId());
        host?.querySelector<HTMLElement>('.au-choice.invalid input, [aria-invalid="true"]')?.focus();
      },
      { injector: this.injector },
    );
  }
}
