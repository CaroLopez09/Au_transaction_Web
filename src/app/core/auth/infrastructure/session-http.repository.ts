import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../../configuration/app-config';
import { Operator } from '../session';
import { MfaEnrollment, SessionGrant, SessionRepository, SignInResult } from '../session.repository';
import { LoginResultDto, MeDto, MfaSetupDto } from './session.dto';
import { toOperator, toSessionGrant, toSignInResult } from './session.mapper';

@Injectable()
export class SessionHttpRepository extends SessionRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_CONFIG).apiBaseUrl;

  signIn(email: string, password: string): Observable<SignInResult> {
    return this.http.post<LoginResultDto>(`${this.baseUrl}/auth/login`, { email, password }).pipe(map(toSignInResult));
  }

  verifyMfa(challenge: string, code: string): Observable<SessionGrant> {
    return this.http
      .post<LoginResultDto>(`${this.baseUrl}/auth/mfa/verify`, { challenge, code })
      .pipe(map(toSessionGrant));
  }

  setupMfa(challenge: string | null): Observable<MfaEnrollment> {
    return this.http.post<MfaSetupDto>(`${this.baseUrl}/auth/mfa/setup`, challenge ? { challenge } : {});
  }

  enableMfa(challenge: string | null, code: string): Observable<SessionGrant> {
    return this.http
      .post<LoginResultDto>(`${this.baseUrl}/auth/mfa/enable`, { ...(challenge ? { challenge } : {}), code })
      .pipe(map(toSessionGrant));
  }

  disableMfa(code: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/mfa/disable`, { code });
  }

  currentOperator(accessToken: string): Observable<Operator> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
    return this.http.get<MeDto>(`${this.baseUrl}/auth/me`, { headers }).pipe(map(toOperator));
  }
}
