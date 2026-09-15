import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../core/auth/session.store';
import { roleLabel } from '../../core/permissions/role';
import { ErrorState } from '../../shared/ui/error-state';
import { Icon } from '../../shared/ui/icon';
import { Skeleton } from '../../shared/ui/skeleton';
import { StatusBadge } from '../../shared/ui/status-badge';
import { dataOf, errorOf } from '../../shared/utilities/remote-data';
import { AccountsFacade } from '../accounts/application/accounts.facade';
import { OnboardingFacade } from '../onboarding/application/onboarding.facade';
import { onboardingStage } from '../onboarding/domain/onboarding-status';
import { stageCopy } from '../onboarding/presentation/onboarding-copy';
import { PayoutsFacade } from '../payouts/application/payouts.facade';
import { approvalBlocker } from '../payouts/domain/payout';
import { RfisFacade } from '../rfis/application/rfis.facade';
import { homeAttention } from './home-attention';

/** Inicio: una sola cosa que requiere atención y el estado operativo, con datos reales del BFF. */
@Component({
  selector: 'au-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, ErrorState, Skeleton, Icon, DecimalPipe],
  providers: [AccountsFacade, PayoutsFacade, RfisFacade],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements OnInit {
  protected readonly facade = inject(OnboardingFacade);
  private readonly accounts = inject(AccountsFacade);
  private readonly payouts = inject(PayoutsFacade);
  private readonly rfis = inject(RfisFacade);
  private readonly session = inject(SessionStore);

  protected readonly roleName = computed(() => roleLabel(this.session.role()));
  protected readonly statusError = computed(() => errorOf(this.facade.status()));
  protected readonly roster = computed(() => dataOf(this.facade.roster()));
  protected readonly rosterError = computed(() => errorOf(this.facade.roster()));

  protected readonly accountSummary = computed(() => {
    const list = dataOf(this.accounts.accounts());
    return list ? { total: list.length, operational: list.filter((account) => account.fundsReady).length } : null;
  });
  private readonly openRfis = computed(() => (dataOf(this.rfis.list()) ?? []).filter((rfi) => rfi.open));
  private readonly approvable = computed(() => {
    if (!this.session.can('payouts.approve')) {
      return [];
    }
    const userId = this.session.operator()?.userId ?? null;
    return (dataOf(this.payouts.list()) ?? []).filter((payout) => approvalBlocker(payout, userId) === null);
  });
  protected readonly pendingPayouts = computed(
    () => (dataOf(this.payouts.list()) ?? []).filter((payout) => payout.approvalState === 'PENDING_APPROVAL').length,
  );
  protected readonly openRfiCount = computed(() => this.openRfis().length);

  protected readonly overview = computed(() => {
    const status = dataOf(this.facade.status());
    if (!status) {
      return null;
    }
    const onboarding = stageCopy(onboardingStage(status), status.companyName, this.session.can('onboarding.manage'));
    return {
      status,
      onboarding,
      attention: homeAttention({
        openRfis: this.openRfis().length,
        overdueRfis: this.openRfis().filter((rfi) => rfi.overdue).length,
        approvablePayouts: this.approvable().length,
        onboarding,
      }),
    };
  });

  ngOnInit(): void {
    this.facade.load();
    void this.accounts.loadList();
    void this.payouts.loadList();
    void this.rfis.loadList(true);
  }
}
