import { IconName } from '../../shared/ui/icon';
import { Capability } from '../permissions/capabilities';

export interface NavigationItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
  /** `null` = visible para cualquier sesión (lecturas permitidas a todos los roles). */
  readonly requires: Capability | null;
  readonly exact: boolean;
}

/**
 * Solo áreas ya integradas con el backend. Cada nueva área entra aquí cuando su corte vertical
 * está conectado y verificado: no hay entradas "próximamente".
 */
export const NAVIGATION: readonly NavigationItem[] = [
  { path: '/', label: 'Inicio', icon: 'home', requires: null, exact: true },
  { path: '/vinculacion', label: 'Vinculación', icon: 'onboarding', requires: null, exact: false },
  { path: '/cuentas', label: 'Cuentas', icon: 'accounts', requires: null, exact: false },
  { path: '/depositos', label: 'Depósitos', icon: 'deposits', requires: null, exact: false },
  { path: '/destinatarios', label: 'Destinatarios', icon: 'recipients', requires: null, exact: false },
  { path: '/pagos', label: 'Pagos', icon: 'payouts', requires: null, exact: false },
  { path: '/solicitudes', label: 'Solicitudes', icon: 'rfis', requires: null, exact: false },
  { path: '/avisos', label: 'Avisos', icon: 'bell', requires: null, exact: false },
  { path: '/eventos', label: 'Eventos', icon: 'activity', requires: 'activity.audit', exact: false },
  { path: '/auditoria', label: 'Auditoría', icon: 'history', requires: 'activity.audit', exact: false },
  { path: '/equipo', label: 'Equipo', icon: 'users', requires: 'operators.view', exact: false },
  { path: '/operaciones', label: 'Operaciones', icon: 'building', requires: 'platform.console', exact: false },
];
