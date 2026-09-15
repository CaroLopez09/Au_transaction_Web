import { Observable } from 'rxjs';
import { Operator } from './session';

export interface SignInResult {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
  readonly tenantName: string | null;
}

/** Puerto de sesión. Las páginas y el store no conocen HttpClient. */
export abstract class SessionRepository {
  abstract signIn(email: string, password: string): Observable<SignInResult>;
  /** Recibe el token explícitamente porque se llama antes de fijar la sesión. */
  abstract currentOperator(accessToken: string): Observable<Operator>;
}
