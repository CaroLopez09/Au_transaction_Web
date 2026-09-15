import { StatusTone } from '../../../shared/ui/status-badge';
import { Rfi } from '../domain/rfi';

export function rfiStatusCopy(rfi: Rfi): { label: string; tone: StatusTone } {
  if (rfi.open && rfi.overdue) {
    return { label: 'Vencida', tone: 'critical' };
  }
  switch (rfi.status) {
    case 'PENDING':
      return { label: 'Te toca responder', tone: 'attention' };
    case 'ANSWERED':
      return { label: 'Respondida, en revisión', tone: 'progress' };
    case 'RESOLVED':
      return { label: 'Resuelta', tone: 'success' };
    case 'NOT_RESOLVED':
      return { label: 'No resuelta', tone: 'critical' };
    case 'UNKNOWN':
      return { label: 'Estado en validación', tone: 'neutral' };
  }
}

export function blockingCopy(type: string): string {
  return type === 'transfer'
    ? 'Detiene un pago'
    : type === 'virtual_account_deposit'
      ? 'Detiene un depósito'
      : 'Detiene una operación';
}

export const IDENTIFIER_HINTS: Partial<Record<string, string>> = {
  ein: 'EIN de EE. UU., por ejemplo 12-3456789.',
  ssn: 'SSN de EE. UU.',
  email: 'Correo electrónico.',
  e164: 'Teléfono en formato internacional, por ejemplo +573001234567.',
  url: 'Dirección web completa, con https://.',
  country_alpha3: 'Código de país ISO de tres letras, por ejemplo COL.',
};
