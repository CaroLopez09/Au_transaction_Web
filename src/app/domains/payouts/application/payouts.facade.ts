import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ActionResult,
  fetchRemote,
  loading,
  RemoteData,
  runAction,
  success,
} from '../../../shared/utilities/remote-data';
import {
  ApprovePayout,
  Payout,
  PayoutEvent,
  PayoutRepository,
  ProviderHistoryQuery,
  ProviderPayoutPage,
} from '../domain/payout';
import { Quotation, QuotationRepository } from '../domain/quotation';

/** El BFF acota el listado local a 100. */
export const PAYOUTS_LIMIT = 100;

@Injectable()
export class PayoutsFacade {
  private readonly payouts = inject(PayoutRepository);
  private readonly quotations = inject(QuotationRepository);

  private readonly listState = signal<RemoteData<readonly Payout[]>>(loading());
  private readonly detailState = signal<RemoteData<Payout>>(loading());
  private readonly eventsState = signal<RemoteData<readonly PayoutEvent[]> | null>(null);
  private readonly quotationState = signal<RemoteData<Quotation> | null>(null);
  private readonly historyState = signal<RemoteData<ProviderPayoutPage>>(loading());
  private readonly busyState = signal<'approve' | 'reject' | 'refresh' | null>(null);

  readonly list = this.listState.asReadonly();
  readonly detail = this.detailState.asReadonly();
  /** `null` = el pago aún no tiene id del proveedor: no hay línea de tiempo que pedir. */
  readonly events = this.eventsState.asReadonly();
  readonly quotation = this.quotationState.asReadonly();
  readonly history = this.historyState.asReadonly();
  readonly busy = this.busyState.asReadonly();

  async loadList(): Promise<void> {
    this.listState.set(loading());
    this.listState.set(await fetchRemote(this.payouts.list(PAYOUTS_LIMIT)));
  }

  async loadDetail(id: string): Promise<void> {
    this.detailState.set(loading());
    const detail = await fetchRemote(this.payouts.get(id));
    this.detailState.set(detail);
    if (detail.status === 'success') {
      await this.loadRelated(detail.data);
    }
  }

  async loadHistory(query: ProviderHistoryQuery): Promise<void> {
    this.historyState.set(loading());
    this.historyState.set(await fetchRemote(this.payouts.providerHistory(query)));
  }

  /** Aprueba y envía al proveedor en una sola llamada (ExecutePayoutService.approveAndSubmit). */
  approve(id: string, command: ApprovePayout): Promise<ActionResult<Payout> | null> {
    return this.run('approve', this.payouts.approve(id, command));
  }

  reject(id: string, reason: string): Promise<ActionResult<Payout> | null> {
    return this.run('reject', this.payouts.reject(id, reason));
  }

  refresh(id: string): Promise<ActionResult<Payout> | null> {
    return this.run('refresh', this.payouts.refresh(id));
  }

  private async run(
    action: 'approve' | 'reject' | 'refresh',
    source: Observable<Payout>,
  ): Promise<ActionResult<Payout> | null> {
    if (this.busyState()) {
      return null;
    }
    this.busyState.set(action);
    try {
      const result = await runAction(source);
      if (result.ok) {
        this.detailState.set(success(result.value));
        await this.loadRelated(result.value);
      }
      return result;
    } finally {
      this.busyState.set(null);
    }
  }

  private async loadRelated(payout: Payout): Promise<void> {
    const [events, quotation] = await Promise.all([
      payout.providerPayoutId ? fetchRemote(this.payouts.events(payout.id)) : Promise.resolve(null),
      payout.quotationId ? fetchRemote(this.quotations.get(payout.quotationId)) : Promise.resolve(null),
    ]);
    this.eventsState.set(events);
    this.quotationState.set(quotation);
  }
}
