import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../../configuration/app-config';
import { Operator } from '../session';
import { SessionRepository, SignInResult } from '../session.repository';
import { LoginResultDto, MeDto } from './session.dto';
import { toOperator, toSignInResult } from './session.mapper';

@Injectable()
export class SessionHttpRepository extends SessionRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_CONFIG).apiBaseUrl;

  signIn(email: string, password: string): Observable<SignInResult> {
    return this.http.post<LoginResultDto>(`${this.baseUrl}/auth/login`, { email, password }).pipe(map(toSignInResult));
  }

  currentOperator(accessToken: string): Observable<Operator> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
    return this.http.get<MeDto>(`${this.baseUrl}/auth/me`, { headers }).pipe(map(toOperator));
  }
}
