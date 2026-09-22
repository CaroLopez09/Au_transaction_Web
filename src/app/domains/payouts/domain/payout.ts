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
  | 'CANCELLED'
  | 'EXPIRED'
  | 'UNKNOWN';

export interface Payout {
  readonly id: string;
  readonly virtualAccountId: string;
  readonly recipientId: string;
  /** Nombre resuelto por el BFF: el directorio del portal no lista los destinatarios archivados. */
  readonly recipientName: string | null;
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
  /** Nombre y apellido de quien preparó el pago; nulo si esa cuenta ya no existe. */
  readonly makerName: string | null;
  readonly approverUserId: string | null;
  readonly approverName: string | null;
  /** Primera firma cuando el pago supera el límite de la empresa y necesita dos. */
  readonly firstApproverUserId: string | null;
  readonly firstApproverName: string | null;
  /** 1 o 2 aprobaciones, según el límite configurado en el BFF. */
  readonly requiredApprovals: number;
  readonly priceLocked: boolean;
  readonly providerPayoutId: string | null;
  /** IMAD / ACH trace / UETR: el comprobante que pide el cliente final. */
  readonly referenceNumber: string | null;
  readonly paymentMethod: string | null;
  readonly errorCode: string | null;
  readonly blockedByRfiId: string | null;
  /** No nulo cuando el pago se financia con un depósito cripto en vez del saldo (G-19). */
  readonly fundingNetwork: string | null;
  readonly fundingCurrency: string | null;
  /** JSON crudo del proveedor con dirección/red/vencimiento del depósito. Null si no aplica. */
  readonly depositInstructions: string | null;
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
  /** Con ambos presentes, el pago se financia con un depósito cripto en vez del saldo (G-19). */
  readonly cryptoNetwork?: string | null;
  readonly cryptoCurrency?: string | null;
}

/** Pares válidos según WalletToken (dominio del BFF): USDC no existe en tron. */
export const CRYPTO_FUNDING_PAIRS: Record<string, readonly string[]> = {
  USDC: ['polygon', 'solana'],
  USDT: ['polygon', 'solana', 'tron'],
};

export const CRYPTO_NETWORK_LABELS: Record<string, string> = {
  polygon: 'Polygon',
  solana: 'Solana',
  tron: 'Tron',
};

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
/**
 * Por qué esta persona no puede decidir (Payout.approve). Quien registró el destinatario tampoco
 * aprueba, pero ese dato no viaja: lo rechaza el BFF con su mensaje.
 */
export function approvalBlocker(
  payout: Payout,
  userId: string | null,
): 'not-pending' | 'own-payout' | 'already-signed' | null {
  if (payout.approvalState !== 'PENDING_APPROVAL') {
    return 'not-pending';
  }
  if (payout.makerUserId === userId) {
    return 'own-payout';
  }
  return payout.firstApproverUserId !== null && payout.firstApproverUserId === userId ? 'already-signed' : null;
}

/** Aprobaciones ya dadas de las requeridas, mientras el pago está pendiente. */
export function approvalsGiven(payout: Payout): number {
  return payout.firstApproverUserId ? 1 : 0;
}

export abstract class PayoutRepository {
  abstract list(limit: number): Observable<readonly Payout[]>;
  abstract get(id: string): Observable<Payout>;
  abstract events(id: string): Observable<readonly PayoutEvent[]>;
  /** `idempotencyKey`: UUID por intención; repetirla devuelve el pago ya creado. */
  abstract create(command: CreatePayout, idempotencyKey: string): Observable<Payout>;
  abstract approve(id: string, command: ApprovePayout): Observable<Payout>;
  abstract reject(id: string, reason: string): Observable<Payout>;
  /** POST /api/payouts/{id}/requote — nueva cotización con el mismo importe; anula una primera firma. */
  abstract requote(id: string): Observable<Payout>;
  abstract refresh(id: string): Observable<Payout>;
  abstract providerHistory(query: ProviderHistoryQuery): Observable<ProviderPayoutPage>;
}
