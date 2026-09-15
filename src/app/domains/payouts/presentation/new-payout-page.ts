import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserFacingError } from '../../../core/http/error-mapping';
import { ErrorState } from '../../../shared/ui/error-state';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { dataOf, errorOf } from '../../../shared/utilities/remote-data';
import { tickingClock } from '../../../shared/utilities/ticking-clock';
import { AccountsFacade } from '../../accounts/application/accounts.facade';
import { accountLabel } from '../../accounts/presentation/account-label';
import { OnboardingFacade } from '../../onboarding/application/onboarding.facade';
import { RecipientsFacade } from '../../recipients/application/recipients.facade';
import { isUsableForPayouts } from '../../recipients/domain/recipient';
import { PayoutPreparationFacade } from '../application/payout-preparation.facade';
import {
  isRedeemable,
  Quotation,
  QuotationRail,
  RAIL_LABELS,
  railsForRecipient,
  secondsLeft,
} from '../domain/quotation';

@Component({
  selector: 'au-new-payout-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ReactiveFormsModule, RouterLink, ErrorState, Skeleton, MoneyPipe],
  providers: [AccountsFacade, RecipientsFacade, PayoutPreparationFacade],
  templateUrl: './new-payout-page.html',
  styleUrl: './new-payout-page.css',
})
export class NewPayoutPage implements OnInit {
  protected readonly accounts = inject(AccountsFacade);
  protected readonly recipients = inject(RecipientsFacade);
  protected readonly preparation = inject(PayoutPreparationFacade);
  private readonly onboarding = inject(OnboardingFacade);
  private readonly router = inject(Router);
  private readonly now = tickingClock();

  protected readonly railLabels = RAIL_LABELS;
  protected readonly onboardingLoaded = computed(() => this.onboarding.status().status === 'success');
  protected readonly treasuryEnabled = computed(() => dataOf(this.onboarding.status())?.status === 'VERIFIED');

  private readonly allAccounts = computed(() => dataOf(this.accounts.accounts()) ?? []);
  private readonly allRecipients = computed(() => dataOf(this.recipients.recipients()) ?? []);
  /** Cotizar exige `fundsReady` (CreateQuoteService); las demás cuentas no se ofrecen. */
  protected readonly accountOptions = computed(() =>
    this.allAccounts()
      .filter((account) => account.fundsReady)
      .map((account) => ({ id: account.id, label: accountLabel(account), currency: account.currency })),
  );
  protected readonly excludedAccounts = computed(() => this.allAccounts().length - this.accountOptions().length);
  protected readonly recipientOptions = computed(() => this.allRecipients().filter(isUsableForPayouts));
  protected readonly excludedRecipients = computed(() => this.allRecipients().length - this.recipientOptions().length);
  protected readonly loadingData = computed(
    () => this.accounts.accounts().status === 'loading' || this.recipients.recipients().status === 'loading',
  );
  protected readonly loadError = computed(
    () => errorOf(this.accounts.accounts()) ?? errorOf(this.recipients.recipients()),
  );

  protected readonly form = inject(FormBuilder).nonNullable.group({
    accountId: ['', Validators.required],
    recipientId: ['', Validators.required],
    amount: [null as unknown as number, [Validators.required, Validators.min(0.01)]],
    rail: ['' as QuotationRail | ''],
  });
  private readonly recipientId = toSignal(this.form.controls.recipientId.valueChanges, { initialValue: '' });
  protected readonly selectedRecipient = computed(
    () => this.recipientOptions().find((recipient) => recipient.id === this.recipientId()) ?? null,
  );
  protected readonly railOptions = computed(() => {
    const recipient = this.selectedRecipient();
    return recipient ? railsForRecipient(recipient.rail, recipient.network) : [];
  });

  protected readonly submitted = signal(false);
  protected readonly quotation = signal<Quotation | null>(null);
  protected readonly quoteError = signal<UserFacingError | null>(null);
  protected readonly createError = signal<UserFacingError | null>(null);

  protected readonly seconds = computed(() => {
    const quotation = this.quotation();
    return quotation ? secondsLeft(quotation, this.now()) : 0;
  });
  protected readonly countdown = computed(() => {
    const total = this.seconds();
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  });
  protected readonly redeemable = computed(() => {
    const quotation = this.quotation();
    return !!quotation && isRedeemable(quotation, this.now()) && !!quotation.destinationCurrency;
  });

  ngOnInit(): void {
    void this.accounts.loadList();
    void this.recipients.loadList();
    if (this.onboarding.status().status !== 'success') {
      this.onboarding.reloadStatus();
    }
  }

  protected invalid(name: 'accountId' | 'recipientId' | 'amount'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected async requestQuote(): Promise<void> {
    this.submitted.set(true);
    this.quoteError.set(null);
    this.createError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const result = await this.preparation.quote({
      virtualAccountId: value.accountId,
      recipientId: value.recipientId,
      amount: value.amount,
      rail: value.rail || null,
    });
    if (!result) {
      return;
    }
    if (result.ok) {
      this.quotation.set(result.value);
      return;
    }
    this.quoteError.set(result.error);
  }

  protected editData(): void {
    this.quotation.set(null);
    this.createError.set(null);
  }

  protected async preparePayout(): Promise<void> {
    const quotation = this.quotation();
    if (!quotation || !this.redeemable() || !quotation.destinationCurrency) {
      return;
    }
    this.createError.set(null);
    const result = await this.preparation.create({
      virtualAccountId: quotation.virtualAccountId,
      recipientId: quotation.recipientId,
      amount: quotation.destinationAmount ?? this.form.getRawValue().amount,
      currency: quotation.destinationCurrency,
      quotationId: quotation.id,
    });
    if (!result) {
      return;
    }
    if (result.ok) {
      await this.router.navigate(['/pagos', result.value.id], { state: { prepared: true } });
      return;
    }
    this.createError.set(result.error);
  }

  protected recipientName(id: string): string {
    return this.recipientOptions().find((recipient) => recipient.id === id)?.name ?? 'Destinatario';
  }

  protected accountName(id: string): string {
    return this.accountOptions().find((account) => account.id === id)?.label ?? 'Cuenta';
  }
}
