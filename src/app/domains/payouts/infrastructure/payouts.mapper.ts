import { toDate } from '../../../shared/utilities/dates';
import { ApprovalState, ApprovePayout, Payout, PayoutEvent, PayoutStatus, ProviderPayoutPage } from '../domain/payout';
import { Quotation } from '../domain/quotation';
import {
  ApprovePayoutDto,
  KiraPayoutPageDto,
  PayoutEventViewDto,
  PayoutViewDto,
  QuotationViewDto,
} from './payouts.dto';

const APPROVAL_STATES: readonly ApprovalState[] = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUBMITTED'];
const STATUSES: readonly PayoutStatus[] = [
  'NOT_SUBMITTED',
  'CREATED',
  'PENDING',
  'PROCESSING',
  'KYT_PENDING',
  'IN_REVIEW',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
];

function normalize<T extends string>(raw: string | undefined, allowed: readonly T[]): T | 'UNKNOWN' {
  const value = raw?.trim().toUpperCase();
  return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : 'UNKNOWN';
}

/** `now` inyectable: la vigencia local se ancla al instante de recepción. */
export function toQuotation(dto: QuotationViewDto, now: number = Date.now()): Quotation {
  const status = normalize(dto.status, ['ACTIVE', 'EXPIRED', 'EXECUTED'] as const);
  return {
    id: dto.id,
    providerQuoteId: dto.kiraQuoteId ?? null,
    virtualAccountId: dto.virtualAccountId,
    recipientId: dto.recipientId,
    rail: dto.rail,
    originAmount: dto.originAmount ?? null,
    destinationAmount: dto.destinationAmount ?? null,
    destinationCurrency: dto.destinationCurrency ?? null,
    exchangeRate: dto.exchangeRate ?? null,
    providerFee: dto.kiraFee ?? null,
    platformFee: dto.platformFee ?? null,
    totalFee: dto.totalFee ?? null,
    totalDebitAmount: dto.totalDebitAmount ?? null,
    balanceSufficient: dto.balanceSufficient,
    fallbackRate: dto.fallbackRate,
    status,
    expiresAt: toDate(dto.expiresAt),
    expiresAtLocal: now + Math.max(0, dto.secondsToExpiry) * 1000,
  };
}

export function toPayout(dto: PayoutViewDto): Payout {
  return {
    id: dto.id,
    virtualAccountId: dto.virtualAccountId,
    recipientId: dto.recipientId,
    recipientName: dto.recipientName ?? null,
    quotationId: dto.quotationId ?? null,
    amount: dto.amount ?? null,
    currency: dto.currency ?? null,
    providerFee: dto.kiraFee ?? null,
    platformFee: dto.platformFee ?? null,
    totalFee: dto.totalFee ?? null,
    totalDebitAmount: dto.totalDebitAmount ?? null,
    approvalState: normalize(dto.approvalState, APPROVAL_STATES),
    status: normalize(dto.status, STATUSES),
    rawStatus: dto.status,
    terminal: dto.terminal,
    makerUserId: dto.makerUserId,
    makerName: dto.makerName ?? null,
    approverUserId: dto.approverUserId ?? null,
    approverName: dto.approverName ?? null,
    firstApproverUserId: dto.firstApproverUserId ?? null,
    firstApproverName: dto.firstApproverName ?? null,
    requiredApprovals: dto.requiredApprovals ?? 1,
    priceLocked: dto.priceLocked,
    providerPayoutId: dto.kiraPayoutId ?? null,
    referenceNumber: dto.referenceNumber ?? null,
    paymentMethod: dto.paymentMethod ?? null,
    errorCode: dto.errorCode ?? null,
    blockedByRfiId: dto.blockedByRfiId ?? null,
    createdAt: toDate(dto.createdAt),
    updatedAt: toDate(dto.updatedAt),
  };
}

export function toPayoutEvent(dto: PayoutEventViewDto): PayoutEvent {
  return {
    id: dto.eventId ?? null,
    status: dto.status ?? null,
    message: dto.message ?? null,
    createdAt: toDate(dto.createdAt),
  };
}

export function toProviderPayoutPage(dto: KiraPayoutPageDto): ProviderPayoutPage {
  return {
    page: dto.page,
    limit: dto.limit,
    total: dto.total,
    totalPages: dto.totalPages,
    items: (dto.items ?? []).map((item) => ({
      providerPayoutId: item.kiraPayoutId ?? null,
      shortId: item.shortId ?? null,
      localPayoutId: item.localPayoutId ?? null,
      status: item.status ?? null,
      origin: item.origin ?? null,
      fromAmount: item.fromAmount ?? null,
      fromCurrency: item.fromCurrency ?? null,
      toAmount: item.toAmount ?? null,
      toCurrency: item.toCurrency ?? null,
      paymentMethod: item.paymentMethod ?? null,
      recipientName: item.recipientName ?? null,
      reference: item.reference ?? null,
      createdAt: toDate(item.createdAt),
    })),
  };
}

/** El cuerpo es opcional: si no hay nada que enviar, viaja vacío. */
export function toApprovePayoutDto(command: ApprovePayout): ApprovePayoutDto {
  return {
    ...(command.comment?.trim() ? { comment: command.comment.trim() } : {}),
    ...(command.natureOfPayment ? { natureOfPayment: command.natureOfPayment } : {}),
    ...(command.memo?.trim() ? { memo: command.memo.trim() } : {}),
    ...(command.documents.length
      ? { documents: command.documents.map((document) => ({ type: document.type, file: document.dataUri })) }
      : {}),
  };
}
