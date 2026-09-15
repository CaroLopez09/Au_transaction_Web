import { toDate } from '../../../shared/utilities/dates';
import { parseAccountMode, parseAccountStatus, VirtualAccount } from '../domain/virtual-account';
import { VirtualAccountViewDto } from './virtual-account.dto';

export function toVirtualAccount(dto: VirtualAccountViewDto): VirtualAccount {
  return {
    id: dto.id,
    providerAccountId: dto.kiraAccountId ?? null,
    status: parseAccountStatus(dto.status),
    rawStatus: dto.status,
    mode: parseAccountMode(dto.mode),
    bank: dto.bank ?? null,
    bankName: dto.bankName ?? null,
    description: dto.description ?? null,
    accountNumber: dto.accountNumber ?? null,
    routingNumber: dto.routingNumber ?? null,
    currency: dto.currency ?? null,
    availableBalance: dto.availableBalance ?? null,
    balanceRefreshedAt: toDate(dto.balanceRefreshedAt),
    balanceStale: dto.balanceStale,
    fundsReady: dto.fundsReady,
    activationDelayed: dto.activationDelayed,
    createdAt: toDate(dto.createdAt),
  };
}
