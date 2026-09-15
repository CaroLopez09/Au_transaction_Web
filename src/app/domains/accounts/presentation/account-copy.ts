import { StatusTone } from '../../../shared/ui/status-badge';
import { AccountReadiness } from '../domain/virtual-account';

export interface ReadinessCopy {
  readonly label: string;
  readonly tone: StatusTone;
  /** Qué significa y qué hacer. `null` cuando la cuenta está operativa. */
  readonly explanation: string | null;
}

export function readinessCopy(readiness: AccountReadiness): ReadinessCopy {
  switch (readiness) {
    case 'operational':
      return { label: 'Operativa', tone: 'success', explanation: null };
    case 'activating':
      return {
        label: 'Activándose',
        tone: 'progress',
        explanation:
          'El banco está habilitando la cuenta. Aún no puede recibir ni enviar fondos; consulta el estado más tarde.',
      };
    case 'delayed':
      return {
        label: 'Activación demorada',
        tone: 'attention',
        explanation:
          'La activación está tardando más de lo normal. Contacta a soporte de AU con el identificador de la cuenta.',
      };
    case 'not-confirmed':
      return {
        label: 'Apertura sin confirmar',
        tone: 'attention',
        explanation:
          'La solicitud se registró, pero el proveedor bancario no confirmó la apertura. Contacta a soporte de AU antes de volver a solicitarla.',
      };
    case 'inactive':
      return { label: 'Desactivada', tone: 'critical', explanation: 'La cuenta no puede operar.' };
    case 'failed':
      return {
        label: 'Apertura fallida',
        tone: 'critical',
        explanation: 'El proveedor rechazó la cuenta. Contacta a soporte de AU.',
      };
  }
}

export function modeLabel(mode: string): string {
  return mode === 'FIAT' ? 'Fiat' : mode === 'CRYPTO' ? 'Cripto' : 'No reconocido';
}
