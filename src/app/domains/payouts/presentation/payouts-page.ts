import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { dataOf, errorOf } from '../../../shared/utilities/remote-data';
import { OnboardingFacade } from '../../onboarding/application/onboarding.facade';
import { RecipientsFacade } from '../../recipients/application/recipients.facade';
import { PAYOUTS_LIMIT, PayoutsFacade } from '../application/payouts.facade';
import { Payout } from '../domain/payout';
import { payoutBadge } from './payout-copy';

@Component({
  selector: 'au-payouts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, StatusBadge, MoneyPipe, DateTimePipe, RouterLink],
  providers: [PayoutsFacade, RecipientsFacade],
  templateUrl: './payouts-page.html',
  styleUrl: './payouts-page.css',
})
export class PayoutsPage implements OnInit {
  protected readonly facade = inject(PayoutsFacade);
  private readonly recipients = inject(RecipientsFacade);
  private readonly session = inject(SessionStore);
  private readonly onboarding = inject(OnboardingFacade);

  protected readonly limit = PAYOUTS_LIMIT;
  protected readonly canPrepare = computed(() => this.session.can('payouts.prepare'));
  protected readonly canApprove = computed(() => this.session.can('payouts.approve'));
  protected readonly treasuryEnabled = computed(() => dataOf(this.onboarding.status())?.status === 'VERIFIED');
  protected readonly registered = computed(() => dataOf(this.onboarding.status())?.providerUserId != null);
  protected readonly error = computed(() => errorOf(this.facade.list()));
  protected readonly all = computed(() => dataOf(this.facade.list()) ?? []);
  /** Respaldo para un pago servido antes de que el BFF resolviera el nombre. */
  private readonly recipientNames = computed(
    () => new Map((dataOf(this.recipients.recipients()) ?? []).map((recipient) => [recipient.id, recipient.name])),
  );
  protected readonly pending = computed(() =>
    this.all().filter((payout) => payout.approvalState === 'PENDING_APPROVAL'),
  );
  protected readonly others = computed(() =>
    this.all().filter((payout) => payout.approvalState !== 'PENDING_APPROVAL'),
  );

  ngOnInit(): void {
    void this.facade.loadList();
    void this.recipients.loadList();
    if (this.onboarding.status().status !== 'success') {
      this.onboarding.reloadStatus();
    }
  }

  protected recipientName(payout: Payout): string {
    return payout.recipientName ?? this.recipientNames().get(payout.recipientId) ?? 'Destinatario no disponible';
  }

  /** Quien lo preparó: el nombre del BFF y, si esa cuenta ya no existe, el hecho de que no es tuyo. */
  protected makerName(payout: Payout): string {
    if (this.isMine(payout)) {
      return 'ti';
    }
    return payout.makerName ?? 'otra persona';
  }

  protected badge(payout: Payout) {
    return payoutBadge(payout);
  }

  /** Un pago propio no se puede aprobar: la etiqueta lo dice antes que el botón. */
  protected isMine(payout: Payout): boolean {
    return payout.makerUserId === this.session.operator()?.userId;
  }
}
