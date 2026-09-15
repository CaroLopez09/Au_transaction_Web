import { Observable } from 'rxjs';

export type ApprovalState = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'UNKNOWN';
export type PayoutStatus =
  | 'NOT_SUBMITTED'
  | 'CREATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'KYT_PENDING'
  | 'IN_REVIEW'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'UNKNOWN';

export interface Payout {
  readonly id: string;
  readonly virtualAccountId: string;
  readonly recipientId: string;
  readonly quotationId: string | null;
  /** Lo que recibe el destinatario. */
  readonly amount: number | null;
  readonly currency: string | null;
  readonly providerFee: number | null;
  readonly platformFee: number | null;
  readonly totalFee: number | null;
  /** Lo que sale de la cuenta. */
  readonly totalDebitAmount: number | null;
  readonly approvalState: ApprovalState;
  readonly status: PayoutStatus;
  readonly rawStatus: string;
  readonly terminal: boolean;
  readonly makerUserId: string;
  readonly approverUserId: string | null;
  readonly priceLocked: boolean;
  readonly providerPayoutId: string | null;
  /** IMAD / ACH trace / UETR: el comprobante que pide el cliente final. */
  readonly referenceNumber: string | null;
  readonly paymentMethod: string | null;
  readonly errorCode: string | null;
  readonly blockedByRfiId: string | null;
  readonly createdAt: Date | null;
  readonly updatedAt: Date | null;
}

export interface PayoutEvent {
  readonly id: string | null;
  readonly status: string | null;
  readonly message: string | null;
  readonly createdAt: Date | null;
}

export interface ProviderPayout {
  readonly providerPayoutId: string | null;
  readonly shortId: string | null;
  readonly localPayoutId: string | null;
  readonly status: string | null;
  /** "deposit", "api"… — movimientos que no nacieron en este portal. */
  readonly origin: string | null;
  readonly fromAmount: string | null;
  readonly fromCurrency: string | null;
  readonly toAmount: string | null;
  readonly toCurrency: string | null;
  readonly paymentMethod: string | null;
  readonly recipientName: string | null;
  readonly reference: string | null;
  readonly createdAt: Date | null;
}

export interface ProviderPayoutPage {
  readonly items: readonly ProviderPayout[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

/** Filtros que acepta GET /api/payouts/kira (ExecutePayoutService.KIRA_PAYOUT_STATUSES). */
export const PROVIDER_STATUS_FILTERS = [
  'CREATED',
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'IN_REVIEW',
  'KYT_PENDING',
] as const;

export interface ProviderHistoryQuery {
  readonly status: string | null;
  readonly page: number;
  /** 1–100 en el BFF. */
  readonly limit: number;
  readonly fromDate: string | null;
  readonly toDate: string | null;
}

export interface CreatePayout {
  readonly virtualAccountId: string;
  readonly recipientId: string;
  readonly amount: number;
  readonly currency: string;
  readonly quotationId: string;
}

/** NatureOfPayment del BFF. */
export const NATURES_OF_PAYMENT = [
  'vendor',
  'pobo',
  'first_party',
  'spot_3p',
  'spot_1p',
  'related_entities',
  'other',
] as const;
export type NatureOfPayment = (typeof NATURES_OF_PAYMENT)[number];

/** SupportingDocument del BFF: data URI base64, máximo 2 y 3 MB medidos sobre el data URI. */
export const MAX_SUPPORTING_DOCUMENTS = 2;
export const MAX_SUPPORTING_DOCUMENT_CHARS = 3 * 1024 * 1024;

export interface SupportingDocument {
  readonly type: 'invoice' | 'other';
  readonly fileName: string;
  readonly dataUri: string;
}

export interface ApprovePayout {
  readonly comment: string | null;
  readonly natureOfPayment: NatureOfPayment | null;
  /** Obligatorio para WIRE en algunos bancos corresponsales. Máx. 255. */
  readonly memo: string | null;
  readonly documents: readonly SupportingDocument[];
}

/** Payout.approve del BFF: pendiente y aprobado por otra persona distinta de quien lo creó. */
export function approvalBlocker(payout: Payout, userId: string | null): 'not-pending' | 'own-payout' | null {
  if (payout.approvalState !== 'PENDING_APPROVAL') {
    return 'not-pending';
  }
  return payout.makerUserId === userId ? 'own-payout' : null;
}

export abstract class PayoutRepository {
  abstract list(limit: number): Observable<readonly Payout[]>;
  abstract get(id: string): Observable<Payout>;
  abstract events(id: string): Observable<readonly PayoutEvent[]>;
  abstract create(command: CreatePayout): Observable<Payout>;
  abstract approve(id: string, command: ApprovePayout): Observable<Payout>;
  abstract reject(id: string, reason: string): Observable<Payout>;
  abstract refresh(id: string): Observable<Payout>;
  abstract providerHistory(query: ProviderHistoryQuery): Observable<ProviderPayoutPage>;
}
