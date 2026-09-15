import { inject, Injectable, signal } from '@angular/core';
import { ActionResult, runAction } from '../../../shared/utilities/remote-data';
import { CreatePayout, Payout, PayoutRepository } from '../domain/payout';
import { CreateQuotation, Quotation, QuotationRepository } from '../domain/quotation';

@Injectable()
export class PayoutPreparationFacade {
  private readonly quotations = inject(QuotationRepository);
  private readonly payouts = inject(PayoutRepository);

  private readonly busyState = signal<'quote' | 'create' | null>(null);
  readonly busy = this.busyState.asReadonly();

  quote(command: CreateQuotation): Promise<ActionResult<Quotation> | null> {
    return this.guard('quote', () => runAction(this.quotations.create(command)));
  }

  /** POST /api/payouts crea un pago nuevo en cada llamada (G-07): se bloquea el doble envío. */
  create(command: CreatePayout): Promise<ActionResult<Payout> | null> {
    return this.guard('create', () => runAction(this.payouts.create(command)));
  }

  private async guard<T>(action: 'quote' | 'create', work: () => Promise<T>): Promise<T | null> {
    if (this.busyState()) {
      return null;
    }
    this.busyState.set(action);
    try {
      return await work();
    } finally {
      this.busyState.set(null);
    }
  }
}
