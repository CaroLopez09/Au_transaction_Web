import { StatusTone } from '../../../shared/ui/status-badge';
import { DepositStatus } from '../domain/deposit';

export function depositStatusCopy(status: DepositStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case 'PENDING':
      return { label: 'En tránsito', tone: 'progress' };
    case 'COMPLETED':
      return { label: 'Acreditado', tone: 'success' };
    case 'FAILED':
      return { label: 'Fallido', tone: 'critical' };
    case 'REFUNDED':
      return { label: 'Devuelto', tone: 'neutral' };
    case 'UNKNOWN':
      return { label: 'Estado en validación', tone: 'neutral' };
  }
}

export const RAIL_LABELS: Record<string, string> = { ACH: 'ACH', WIRE: 'Wire', WALLET: 'Wallet' };
