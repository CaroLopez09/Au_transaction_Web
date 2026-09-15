import { StatusTone } from '../../shared/ui/status-badge';

export interface AttentionInput {
  readonly openRfis: number;
  readonly overdueRfis: number;
  /** Pagos pendientes que ESTA sesión puede aprobar (excluye los que preparó). */
  readonly approvablePayouts: number;
  readonly onboarding: {
    label: string;
    tone: StatusTone;
    headline: string;
    explanation: string;
    awaitsOrganization: boolean;
  };
}

export interface Attention {
  readonly key: 'rfis' | 'approvals' | 'onboarding';
  readonly label: string;
  readonly tone: StatusTone;
  readonly headline: string;
  readonly explanation: string;
  readonly link: string;
  readonly linkLabel: string;
  readonly urgent: boolean;
}

/**
 * Un único bloque de atención (DESIGN.md > La regla de la única señal), por prioridad:
 * una solicitud abierta detiene operaciones y vence sin prórroga → pagos que esperan a esta persona → vinculación.
 */
export function homeAttention(input: AttentionInput): Attention {
  if (input.openRfis > 0) {
    const plural = input.openRfis > 1;
    return {
      key: 'rfis',
      label: input.overdueRfis > 0 ? 'Vencida' : 'Te toca responder',
      tone: input.overdueRfis > 0 ? 'critical' : 'attention',
      headline: plural
        ? `El proveedor espera respuesta a ${input.openRfis} solicitudes de información`
        : 'El proveedor espera respuesta a una solicitud de información',
      explanation: 'Mientras no se responda, lo que bloquea sigue detenido; el plazo no se prorroga.',
      link: '/solicitudes',
      linkLabel: 'Ver solicitudes',
      urgent: true,
    };
  }
  if (input.approvablePayouts > 0) {
    const plural = input.approvablePayouts > 1;
    return {
      key: 'approvals',
      label: 'Por aprobar',
      tone: 'attention',
      headline: plural ? `${input.approvablePayouts} pagos esperan tu aprobación` : 'Un pago espera tu aprobación',
      explanation: 'Revisa importes y cotización antes de aprobar: al hacerlo se envía al proveedor bancario.',
      link: '/pagos',
      linkLabel: 'Revisar pagos',
      urgent: true,
    };
  }
  return {
    key: 'onboarding',
    label: input.onboarding.label,
    tone: input.onboarding.tone,
    headline: input.onboarding.headline,
    explanation: input.onboarding.explanation,
    link: '/vinculacion',
    linkLabel: 'Ver vinculación',
    urgent: input.onboarding.awaitsOrganization,
  };
}
