import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/configuration/app-config';
import {
  OpenVirtualAccount,
  SimulateDeposit,
  VirtualAccount,
  VirtualAccountRepository,
} from '../domain/virtual-account';
import { OpenAccountDto, SimulateDepositDto, VirtualAccountViewDto } from './virtual-account.dto';
import { toVirtualAccount } from './virtual-account.mapper';

@Injectable()
export class VirtualAccountHttpRepository extends VirtualAccountRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(APP_CONFIG).apiBaseUrl}/virtual-accounts`;

  list(): Observable<readonly VirtualAccount[]> {
    return this.http.get<VirtualAccountViewDto[]>(this.url).pipe(map((dtos) => dtos.map(toVirtualAccount)));
  }

  get(id: string): Observable<VirtualAccount> {
    return this.http.get<VirtualAccountViewDto>(`${this.url}/${encodeURIComponent(id)}`).pipe(map(toVirtualAccount));
  }

  open(command: OpenVirtualAccount): Observable<VirtualAccount> {
    const body: OpenAccountDto = {
      ...(command.description?.trim() ? { description: command.description.trim() } : {}),
      ...(command.mode ? { mode: command.mode } : {}),
    };
    return this.http.post<VirtualAccountViewDto>(this.url, body).pipe(map(toVirtualAccount));
  }

  refresh(id: string): Observable<VirtualAccount> {
    return this.http
      .post<VirtualAccountViewDto>(`${this.url}/${encodeURIComponent(id)}/refresh`, null)
      .pipe(map(toVirtualAccount));
  }

  refreshBalance(id: string): Observable<VirtualAccount> {
    return this.http
      .post<VirtualAccountViewDto>(`${this.url}/${encodeURIComponent(id)}/balance`, null)
      .pipe(map(toVirtualAccount));
  }

  simulateDeposit(id: string, command: SimulateDeposit): Observable<VirtualAccount> {
    const body: SimulateDepositDto = { amount: command.amount, paymentType: command.paymentType };
    return this.http
      .post<VirtualAccountViewDto>(`${this.url}/${encodeURIComponent(id)}/simulate-deposit`, body)
      .pipe(map(toVirtualAccount));
  }
}
