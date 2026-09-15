import { Observable } from 'rxjs';
import { RecipientRail } from '../../recipients/domain/recipient';

export type QuotationRail = 'ACH_STANDARD' | 'ACH_SAME_DAY' | 'WIRE_DOMESTIC' | 'TRON' | 'SOLANA' | 'POLYGON';

export interface Quotation {
  readonly id: string;
  readonly providerQuoteId: string | null;
  readonly virtualAccountId: string;
  readonly recipientId: string;
  readonly rail: string;
  /** Lo que recibe el destinatario (la cotización es inversa: comisiones por encima). */
  readonly originAmount: number | null;
  readonly destinationAmount: number | null;
  readonly destinationCurrency: string | null;
  readonly exchangeRate: number | null;
  readonly providerFee: number | null;
  readonly platformFee: number | null;
  readonly totalFee: number | null;
  readonly totalDebitAmount: number | null;
  readonly balanceSufficient: boolean;
  readonly fallbackRate: boolean;
  readonly status: 'ACTIVE' | 'EXPIRED' | 'EXECUTED' | 'UNKNOWN';
  readonly expiresAt: Date | null;
  /**
   * Instante local en que vence, calculado con `secondsToExpiry` en el momento de recibirla:
   * no depende de que el reloj del navegador coincida con el del servidor.
   */
  readonly expiresAtLocal: number;
}

export interface CreateQuotation {
  readonly virtualAccountId: string;
  readonly recipientId: string;
  readonly amount: number;
  /** `null` = el BFF lo deriva del destinatario (única fuente válida). */
  readonly rail: QuotationRail | null;
}

/** QuotationRail.validFor del BFF: el riel del pago se deriva del tipo de cuenta del destinatario. */
export function railsForRecipient(rail: RecipientRail | null, network: string | null): readonly QuotationRail[] {
  switch (rail) {
    case 'ACH':
      return ['ACH_STANDARD', 'ACH_SAME_DAY'];
    case 'WIRE':
      return ['WIRE_DOMESTIC'];
    case 'WALLET': {
      const byNetwork = network?.trim().toUpperCase();
      return byNetwork === 'TRON' || byNetwork === 'SOLANA' || byNetwork === 'POLYGON' ? [byNetwork] : [];
    }
    default:
      return [];
  }
}

export const RAIL_LABELS: Partial<Record<string, string>> = {
  ACH_STANDARD: 'ACH estándar',
  ACH_SAME_DAY: 'ACH mismo día',
  WIRE_DOMESTIC: 'Wire doméstico',
  TRON: 'Tron',
  SOLANA: 'Solana',
  POLYGON: 'Polygon',
};

export function secondsLeft(quotation: Quotation, now: number): number {
  return Math.max(0, Math.floor((quotation.expiresAtLocal - now) / 1000));
}

/** Quotation.assertRedeemable del BFF, en el lado del cliente: vigente, activa y con saldo. */
export function isRedeemable(quotation: Quotation, now: number): boolean {
  return quotation.status === 'ACTIVE' && secondsLeft(quotation, now) > 0 && quotation.balanceSufficient;
}

export abstract class QuotationRepository {
  abstract create(command: CreateQuotation): Observable<Quotation>;
  abstract get(id: string): Observable<Quotation>;
}
