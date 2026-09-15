import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserFacingError } from '../../../core/http/error-mapping';
import { Icon } from '../../../shared/ui/icon';
import { PageHeader } from '../../../shared/ui/page-header';
import { dataOf } from '../../../shared/utilities/remote-data';
import { OnboardingFacade } from '../../onboarding/application/onboarding.facade';
import { RecipientsFacade } from '../application/recipients.facade';
import {
  BankAccountKind,
  isBlankAddress,
  ISO_ALPHA2_PATTERN,
  MAX_PHONE_LENGTH,
  networksFor,
  PostalAddress,
  RegisterRecipient,
  ROUTING_NUMBER_PATTERN,
  SWIFT_PATTERN,
  WALLET_TOKENS,
  WalletToken,
} from '../domain/recipient';

type Rail = 'ACH' | 'WIRE' | 'WALLET';

const MESSAGES: Record<string, Record<string, string>> = {
  companyName: { required: 'Escribe la razón social.' },
  firstName: { required: 'Escribe el nombre.' },
  lastName: { required: 'Escribe el apellido.' },
  email: { email: 'Escribe un correo válido.' },
  phone: { maxlength: `Máximo ${MAX_PHONE_LENGTH} caracteres.` },
  routingNumber: { required: 'Escribe el routing number.', pattern: 'Debe tener exactamente 9 dígitos.' },
  accountNumber: { required: 'Escribe el número de cuenta.' },
  accountKind: { required: 'Elige el tipo de cuenta.' },
  swiftCode: { pattern: 'El SWIFT/BIC tiene 8 u 11 caracteres.' },
  token: { required: 'Elige el token.' },
  network: { required: 'Elige la red.' },
  walletAddress: { required: 'Escribe la dirección de la wallet.' },
  country: { required: 'Indica el país.', pattern: 'Usa el código ISO de dos letras, por ejemplo US.' },
  addressLines: { required: 'Indica al menos calle, ciudad o código postal.' },
};

@Component({
  selector: 'au-new-recipient-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ReactiveFormsModule, RouterLink, Icon],
  providers: [RecipientsFacade],
  templateUrl: './new-recipient-page.html',
  styleUrl: './new-recipient-page.css',
})
export class NewRecipientPage implements OnInit {
  protected readonly facade = inject(RecipientsFacade);
  private readonly onboarding = inject(OnboardingFacade);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly tokens = Object.entries(WALLET_TOKENS).map(([value, spec]) => ({ value, label: spec.label }));
  protected readonly treasuryEnabled = computed(() => dataOf(this.onboarding.status())?.status === 'VERIFIED');
  protected readonly onboardingLoaded = computed(() => this.onboarding.status().status === 'success');
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<UserFacingError | null>(null);

  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    rail: this.fb.control<Rail | ''>('', Validators.required),
    business: this.fb.control<'person' | 'company'>('company'),
    companyName: [''],
    firstName: [''],
    lastName: [''],
    email: ['', Validators.email],
    phone: ['', Validators.maxLength(MAX_PHONE_LENGTH)],
    routingNumber: [''],
    accountNumber: [''],
    accountKind: this.fb.control<BankAccountKind | ''>(''),
    bankName: [''],
    swiftCode: [''],
    bankAddressText: [''],
    token: this.fb.control<WalletToken | ''>(''),
    network: [''],
    walletAddress: [''],
    streetName: [''],
    city: [''],
    state: [''],
    postalCode: [''],
    country: [''],
    docType: [''],
    docNumber: [''],
  });

  protected readonly rail = toSignal(this.form.controls.rail.valueChanges, { initialValue: '' as Rail | '' });
  protected readonly business = toSignal(this.form.controls.business.valueChanges, {
    initialValue: 'company' as 'person' | 'company',
  });
  private readonly token = toSignal(this.form.controls.token.valueChanges, { initialValue: '' as WalletToken | '' });
  protected readonly networks = computed(() => networksFor(this.token() || null));
  protected readonly isBank = computed(() => this.rail() === 'ACH' || this.rail() === 'WIRE');

  constructor() {
    this.form.controls.rail.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.applyRules());
    this.form.controls.business.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.applyRules());
    this.form.controls.token.valueChanges.pipe(takeUntilDestroyed()).subscribe((token) => {
      if (!networksFor(token || null).includes(this.form.controls.network.value)) {
        this.form.controls.network.setValue('');
      }
    });
    this.applyRules();
  }

  ngOnInit(): void {
    if (this.onboarding.status().status !== 'success') {
      this.onboarding.reloadStatus();
    }
  }

  /** Reglas del BFF por riel y tipo de titular (RecipientHolder, RecipientAccount, Recipient). */
  private applyRules(): void {
    const rail = this.form.controls.rail.value;
    const company = this.form.controls.business.value === 'company';
    const bank = rail === 'ACH' || rail === 'WIRE';
    const c = this.form.controls;
    this.setRules(c.companyName, company ? [Validators.required] : []);
    this.setRules(c.firstName, company ? [] : [Validators.required]);
    this.setRules(c.lastName, company ? [] : [Validators.required]);
    this.setRules(c.routingNumber, bank ? [Validators.required, Validators.pattern(ROUTING_NUMBER_PATTERN)] : []);
    this.setRules(c.accountNumber, bank ? [Validators.required] : []);
    this.setRules(c.accountKind, bank ? [Validators.required] : []);
    this.setRules(c.swiftCode, rail === 'WIRE' ? [Validators.pattern(SWIFT_PATTERN)] : []);
    this.setRules(c.token, rail === 'WALLET' ? [Validators.required] : []);
    this.setRules(c.network, rail === 'WALLET' ? [Validators.required] : []);
    this.setRules(c.walletAddress, rail === 'WALLET' ? [Validators.required] : []);
    // Dirección del titular: obligatoria para bancos, opcional para wallets (con país ISO-2 si se da).
    this.setRules(
      c.country,
      bank ? [Validators.required, Validators.pattern(ISO_ALPHA2_PATTERN)] : [Validators.pattern(ISO_ALPHA2_PATTERN)],
    );
  }

  private setRules(
    control: { setValidators(v: ValidatorFn[]): void; updateValueAndValidity(o: object): void },
    rules: ValidatorFn[],
  ): void {
    control.setValidators(rules);
    control.updateValueAndValidity({ emitEvent: false });
  }

  protected addressLinesMissing(): boolean {
    return this.isBank() && isBlankAddress(this.address());
  }

  protected invalid(name: keyof typeof this.form.controls | 'addressLines'): boolean {
    if (name === 'addressLines') {
      return this.submitted() && this.addressLinesMissing();
    }
    const control = this.form.controls[name];
    return (control.invalid && (control.touched || this.submitted())) || !!this.serverError()?.fieldErrors[name];
  }

  protected errorFor(name: keyof typeof this.form.controls | 'addressLines'): string | null {
    if (name === 'addressLines') {
      return this.invalid('addressLines') ? MESSAGES['addressLines']['required'] : null;
    }
    const server = this.serverError()?.fieldErrors[name];
    if (server) {
      return server;
    }
    const control = this.form.controls[name];
    if (!control.errors || !(control.touched || this.submitted())) {
      return null;
    }
    const key = Object.keys(control.errors)[0];
    return MESSAGES[name]?.[key] ?? 'Revisa este dato.';
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.form.invalid || this.addressLinesMissing()) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    const result = await this.facade.register(this.toCommand());
    if (!result) {
      return;
    }
    if (result.ok) {
      await this.router.navigate(['/destinatarios'], {
        state: { registered: result.value.name, alreadyExisted: result.value.alreadyExisted },
      });
      return;
    }
    this.serverError.set(result.error);
    afterNextRender(() => document.getElementById('recipient-error')?.focus(), { injector: this.injector });
  }

  private address(): PostalAddress {
    const v = this.form.getRawValue();
    return { streetName: v.streetName, city: v.city, state: v.state, postalCode: v.postalCode, country: v.country };
  }

  private toCommand(): RegisterRecipient {
    const v = this.form.getRawValue();
    const holder = {
      business: v.business === 'company',
      companyName: v.companyName || null,
      firstName: v.firstName || null,
      lastName: v.lastName || null,
      email: v.email || null,
      phone: v.phone || null,
    };
    const address = this.address();
    const destination =
      v.rail === 'WALLET'
        ? {
            rail: 'WALLET' as const,
            token: v.token as WalletToken,
            network: v.network,
            walletAddress: v.walletAddress,
            address: isBlankAddress(address) && !address.country ? null : address,
          }
        : {
            rail: v.rail as 'ACH' | 'WIRE',
            routingNumber: v.routingNumber,
            accountNumber: v.accountNumber,
            accountKind: v.accountKind as BankAccountKind,
            bankName: v.bankName || null,
            swiftCode: v.rail === 'WIRE' ? v.swiftCode || null : null,
            bankAddressText: v.rail === 'ACH' ? v.bankAddressText || null : null,
            bankAddress: null,
            address,
          };
    return { holder, destination, docType: v.docType || null, docNumber: v.docNumber || null };
  }

  private focusFirstInvalid(): void {
    afterNextRender(
      () =>
        document
          .querySelector<HTMLElement>('#recipient-form [aria-invalid="true"], #recipient-form .au-choice.invalid input')
          ?.focus(),
      { injector: this.injector },
    );
  }
}
