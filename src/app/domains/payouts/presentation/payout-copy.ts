import { StatusTone } from '../../../shared/ui/status-badge';
import { ApprovalState, NatureOfPayment, Payout, PayoutStatus } from '../domain/payout';

export function approvalCopy(state: ApprovalState): { label: string; tone: StatusTone } {
  switch (state) {
    case 'PENDING_APPROVAL':
      return { label: 'Por aprobar', tone: 'attention' };
    case 'APPROVED':
      return { label: 'Aprobado', tone: 'progress' };
    case 'REJECTED':
      return { label: 'Rechazado', tone: 'critical' };
    case 'SUBMITTED':
      return { label: 'Enviado al proveedor', tone: 'progress' };
    case 'UNKNOWN':
      return { label: 'Estado en validación', tone: 'neutral' };
  }
}

/** docs/frontend-architecture.md §8 — pagos. */
export function statusCopy(status: PayoutStatus): { label: string; tone: StatusTone; explanation: string | null } {
  switch (status) {
    case 'NOT_SUBMITTED':
      return { label: 'Sin enviar', tone: 'neutral', explanation: null };
    case 'CREATED':
    case 'PENDING':
    case 'PROCESSING':
      return {
        label: 'En proceso',
        tone: 'progress',
        explanation: 'El proveedor está procesando el pago. No lo reenvíes.',
      };
    case 'KYT_PENDING':
      return {
        label: 'Validación transaccional',
        tone: 'progress',
        explanation: 'El proveedor está haciendo sus controles habituales de la transacción.',
      };
    case 'IN_REVIEW':
      return { label: 'Revisión operativa', tone: 'progress', explanation: 'El proveedor revisa el pago manualmente.' };
    case 'COMPLETED':
      return { label: 'Completado', tone: 'success', explanation: null };
    case 'FAILED':
      return {
        label: 'Fallido',
        tone: 'critical',
        explanation: 'El pago no se completó. Si hubo devolución, el saldo se reflejará al consultar la cuenta.',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelado',
        tone: 'neutral',
        explanation: 'El pago se detuvo antes de enviarse. No salió dinero de la cuenta.',
      };
    case 'EXPIRED':
      return { label: 'Vencido', tone: 'neutral', explanation: null };
    case 'UNKNOWN':
      return {
        label: 'Estado en validación',
        tone: 'neutral',
        explanation: 'No asumimos éxito ni fracaso: consulta el estado.',
      };
  }
}

/** Estado visible en listados: aprobación mientras no se envía, estado del proveedor después. */
export function payoutBadge(payout: Payout): { label: string; tone: StatusTone } {
  if (payout.blockedByRfiId) {
    return { label: 'Detenido por solicitud de información', tone: 'attention' };
  }
  return payout.approvalState === 'SUBMITTED' ? statusCopy(payout.status) : approvalCopy(payout.approvalState);
}

/** Significados de docs.kirafin.ai/reference/payouts/values (nature_of_payment), traducidos. */
export const NATURE_LABELS: Record<NatureOfPayment, string> = {
  vendor: 'Pago a un proveedor',
  pobo: 'Pago en nombre de un cliente propio',
  first_party: 'Movimiento de fondos propios a sí mismo',
  spot_3p: 'Pago puntual a un tercero',
  spot_1p: 'Pago puntual a sí mismo',
  related_entities: 'Entre empresas del mismo grupo',
  other: 'Otro',
};
