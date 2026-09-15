import { toDate } from '../../../shared/utilities/dates';
import { Deposit, parseDepositStatus, parseRail } from '../domain/deposit';
import { DepositViewDto } from './deposit.dto';

export function toDeposit(dto: DepositViewDto): Deposit {
  return {
    id: dto.id,
    providerDepositId: dto.kiraDepositId ?? null,
    virtualAccountId: dto.virtualAccountId,
    grossAmount: dto.grossAmount ?? null,
    feeAmount: dto.feeAmount ?? null,
    netAmount: dto.netAmount ?? null,
    currency: dto.currency ?? null,
    senderName: dto.senderName ?? null,
    senderAccount: dto.senderAccount ?? null,
    rail: parseRail(dto.rail),
    status: parseDepositStatus(dto.status),
    rawStatus: dto.status,
    microdeposit: dto.microdeposit,
    creditsBalance: dto.creditsBalance,
    held: dto.held ?? false,
    createdAt: toDate(dto.createdAt),
    updatedAt: toDate(dto.updatedAt),
  };
}
