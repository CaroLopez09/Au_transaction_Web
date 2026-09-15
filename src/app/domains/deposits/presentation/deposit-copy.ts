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
    case 'KYT_PENDING':
      return { label: 'Retenido por cumplimiento', tone: 'attention' };
    case 'KYT_REJECTED':
      return { label: 'Congelado por cumplimiento', tone: 'critical' };
    case 'UNKNOWN':
      return { label: 'Estado en validación', tone: 'neutral' };
  }
}

/** Texto del aviso cuando hay depósitos retenidos (compliance/holds del proveedor). */
export const HELD_DEPOSITS_NOTICE =
  'Hay depósitos retenidos por un control de cumplimiento del proveedor. Mientras dure la retención, la cuenta ' +
  'que los recibió no puede enviar pagos. No hace falta reintentar: se libera sola o tras responder una solicitud ' +
  'de información.';

export const RAIL_LABELS: Record<string, string> = { ACH: 'ACH', WIRE: 'Wire', WALLET: 'Wallet' };
