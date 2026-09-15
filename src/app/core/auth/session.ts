import { Role } from '../permissions/role';

export interface Operator {
  readonly userId: string;
  readonly email: string;
  readonly tenantId: string;
  /** `null` si el backend envía un rol que este frontend no conoce: sin capacidades. */
  readonly role: Role | null;
  readonly mfaEnabled: boolean;
  /** El entorno exige segundo factor: no se puede desactivar. */
  readonly mfaEnforced: boolean;
}

export interface Session {
  readonly accessToken: string;
  /** Instante absoluto (ms epoch) calculado desde `expiresIn` en el login. */
  readonly expiresAt: number;
  readonly operator: Operator;
  readonly tenantName: string | null;
}

export type SessionEndReason = 'signed-out' | 'expired';

export function isSessionValid(session: Session, now: number): boolean {
  return session.expiresAt > now;
}
