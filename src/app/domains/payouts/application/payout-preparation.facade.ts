import { inject, Injectable, signal } from '@angular/core';
import { ActionResult, runAction } from '../../../shared/utilities/remote-data';
import { CreatePayout, Payout, PayoutRepository } from '../domain/payout';
import { CreateQuotation, Quotation, QuotationRepository } from '../domain/quotation';

@Injectable()
export class PayoutPreparationFacade {
  private readonly quotations = inject(QuotationRepository);
  private readonly payouts = inject(PayoutRepository);

  private readonly busyState = signal<'quote' | 'create' | null>(null);
  /** Una clave por pago que se intenta crear: un reintento de red o un doble clic reutilizan la misma. */
  private intentKey = crypto.randomUUID();
  readonly busy = this.busyState.asReadonly();

  quote(command: CreateQuotation): Promise<ActionResult<Quotation> | null> {
    return this.guard('quote', () => runAction(this.quotations.create(command)));
  }

  /** Con la misma clave el BFF devuelve el pago ya creado en vez de crear otro (G-07). */
  create(command: CreatePayout): Promise<ActionResult<Payout> | null> {
    return this.guard('create', async () => {
      const result = await runAction(this.payouts.create(command, this.intentKey));
      if (result.ok) {
        this.intentKey = crypto.randomUUID();
      }
      return result;
    });
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
