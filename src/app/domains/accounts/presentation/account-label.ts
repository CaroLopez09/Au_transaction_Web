import { maskTail } from '../../../shared/utilities/mask';
import { VirtualAccount } from '../domain/virtual-account';

/** Nombre legible de una cuenta con datos reales: descripción, banco y últimos dígitos si existen. */
export function accountLabel(account: VirtualAccount): string {
  const name = account.description ?? account.bankName ?? 'Cuenta virtual';
  const digits = account.accountNumber && account.fundsReady ? ` ${maskTail(account.accountNumber)}` : '';
  const currency = account.currency ? ` · ${account.currency}` : '';
  return `${name}${digits}${currency}`;
}
