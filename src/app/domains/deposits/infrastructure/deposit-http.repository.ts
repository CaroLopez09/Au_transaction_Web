import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/configuration/app-config';
import { Deposit, DepositRepository } from '../domain/deposit';
import { DepositViewDto } from './deposit.dto';
import { toDeposit } from './deposit.mapper';

@Injectable()
export class DepositHttpRepository extends DepositRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_CONFIG).apiBaseUrl;

  list(limit: number): Observable<readonly Deposit[]> {
    return this.http
      .get<DepositViewDto[]>(`${this.baseUrl}/deposits`, { params: new HttpParams().set('limit', limit) })
      .pipe(map((dtos) => dtos.map(toDeposit)));
  }

  listByAccount(accountId: string, limit: number): Observable<readonly Deposit[]> {
    return this.http
      .get<DepositViewDto[]>(`${this.baseUrl}/virtual-accounts/${encodeURIComponent(accountId)}/deposits`, {
        params: new HttpParams().set('limit', limit),
      })
      .pipe(map((dtos) => dtos.map(toDeposit)));
  }

  syncAccount(accountId: string): Observable<readonly Deposit[]> {
    return this.http
      .post<DepositViewDto[]>(`${this.baseUrl}/virtual-accounts/${encodeURIComponent(accountId)}/deposits/sync`, null)
      .pipe(map((dtos) => dtos.map(toDeposit)));
  }
}
