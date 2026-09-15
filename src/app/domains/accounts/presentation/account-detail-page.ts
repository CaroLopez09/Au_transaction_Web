import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { APP_CONFIG } from '../../../core/configuration/app-config';
import { UserFacingError } from '../../../core/http/error-mapping';
import { CopyButton } from '../../../shared/ui/copy-button';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { Drawer } from '../../../shared/ui/drawer';
import { ErrorState } from '../../../shared/ui/error-state';
import { Icon } from '../../../shared/ui/icon';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { dataOf, errorOf } from '../../../shared/utilities/remote-data';
import { DepositsFacade } from '../../deposits/application/deposits.facade';
import { DepositTable } from '../../deposits/presentation/deposit-table';
import { AccountsFacade } from '../application/accounts.facade';
import { accountReadiness, canQueryProvider } from '../domain/virtual-account';
import { modeLabel, readinessCopy } from './account-copy';

@Component({
  selector: 'au-account-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader,
    ErrorState,
    Skeleton,
    StatusBadge,
    MoneyPipe,
    DateTimePipe,
    RouterLink,
    CopyButton,
    DepositTable,
    Drawer,
    ReactiveFormsModule,
    Icon,
  ],
  providers: [AccountsFacade, DepositsFacade],
  templateUrl: './account-detail-page.html',
  styleUrl: './account-detail-page.css',
})
export class AccountDetailPage implements OnInit {
  /** Parámetro de ruta `:id` (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly facade = inject(AccountsFacade);
  protected readonly deposits = inject(DepositsFacade);
  private readonly session = inject(SessionStore);
  private readonly sandboxTools = inject(APP_CONFIG).sandboxTools;

  protected readonly account = computed(() => dataOf(this.facade.detail()));
  protected readonly detailError = computed(() => errorOf(this.facade.detail()));
  protected readonly depositList = computed(() => dataOf(this.deposits.deposits()));
  protected readonly depositsError = computed(() => errorOf(this.deposits.deposits()));
  protected readonly view = computed(() => {
    const account = this.account();
    if (!account) {
      return null;
    }
    return {
      account,
      readiness: readinessCopy(accountReadiness(account)),
      queryable: canQueryProvider(account) && this.session.can('provider.refresh'),
      mode: modeLabel(account.mode),
      canSimulate: this.sandboxTools && this.session.can('accounts.simulateDeposit') && canQueryProvider(account),
    };
  });

  /** Error de la última acción (consultar estado, saldo, sincronizar), separado de la carga de la página. */
  protected readonly actionError = signal<UserFacingError | null>(null);
  protected readonly simulateOpen = signal(false);
  protected readonly simulateError = signal<UserFacingError | null>(null);
  protected readonly simulateForm = inject(FormBuilder).group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    paymentType: ['wire' as 'wire' | 'ach', Validators.required],
  });

  ngOnInit(): void {
    void this.facade.loadDetail(this.id());
    void this.deposits.loadForAccount(this.id());
  }

  protected async refreshStatus(): Promise<void> {
    this.actionError.set(null);
    const result = await this.facade.refresh(this.id());
    if (result && !result.ok) {
      this.actionError.set(result.error);
    }
  }

  protected async refreshBalance(): Promise<void> {
    this.actionError.set(null);
    const result = await this.facade.refreshBalance(this.id());
    if (result && !result.ok) {
      this.actionError.set(result.error);
    }
  }

  protected async syncDeposits(): Promise<void> {
    this.actionError.set(null);
    const result = await this.deposits.syncAccount(this.id());
    if (result && !result.ok) {
      this.actionError.set(result.error);
    }
  }

  protected startSimulation(): void {
    this.simulateForm.reset({ amount: null, paymentType: 'wire' });
    this.simulateError.set(null);
    this.simulateOpen.set(true);
  }

  protected closeSimulation(): void {
    if (this.facade.busy() !== 'simulate') {
      this.simulateOpen.set(false);
    }
  }

  protected async submitSimulation(): Promise<void> {
    if (this.simulateForm.invalid) {
      this.simulateForm.markAllAsTouched();
      return;
    }
    const value = this.simulateForm.getRawValue();
    const result = await this.facade.simulateDeposit(this.id(), {
      amount: value.amount ?? 0,
      paymentType: value.paymentType ?? 'wire',
    });
    if (!result) {
      return;
    }
    if (result.ok) {
      this.simulateOpen.set(false);
      void this.deposits.loadForAccount(this.id());
      return;
    }
    this.simulateError.set(result.error);
  }
}
