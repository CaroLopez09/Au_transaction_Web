import { Observable } from 'rxjs';
import { Operator } from './session';

/** Sesión emitida por el BFF tras superar todos los factores. */
export interface SessionGrant {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
  readonly tenantName: string | null;
}

/**
 * Resultado de la contraseña: una sesión, o un reto de segundo factor. `setupRequired` significa que
 * el entorno exige MFA y la cuenta aún no lo tiene: hay que configurarlo antes de entrar.
 */
export type SignInResult =
  | ({ readonly kind: 'session' } & SessionGrant)
  | {
      readonly kind: 'mfa';
      readonly challenge: string;
      readonly setupRequired: boolean;
      readonly expiresInSeconds: number;
    };

/** Secreto TOTP que se muestra una sola vez para la app autenticadora. */
export interface MfaEnrollment {
  readonly secret: string;
  readonly otpauthUri: string;
}

/** Puerto de sesión. Las páginas y el store no conocen HttpClient. */
export abstract class SessionRepository {
  abstract signIn(email: string, password: string): Observable<SignInResult>;
  /** Recibe el token explícitamente porque se llama antes de fijar la sesión. */
  abstract currentOperator(accessToken: string): Observable<Operator>;
  /** POST /api/auth/mfa/verify — reto del login más el código. */
  abstract verifyMfa(challenge: string, code: string): Observable<SessionGrant>;
  /** POST /api/auth/mfa/setup — con el reto del login o, si `challenge` es null, con la sesión actual. */
  abstract setupMfa(challenge: string | null): Observable<MfaEnrollment>;
  /** POST /api/auth/mfa/enable — confirma el secreto con el primer código y emite una sesión nueva. */
  abstract enableMfa(challenge: string | null, code: string): Observable<SessionGrant>;
  /** POST /api/auth/mfa/disable — solo si el entorno no lo exige. */
  abstract disableMfa(code: string): Observable<void>;
}
