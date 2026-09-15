import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/configuration/app-config';
import {
  ApprovePayout,
  CreatePayout,
  Payout,
  PayoutEvent,
  PayoutRepository,
  ProviderHistoryQuery,
  ProviderPayoutPage,
} from '../domain/payout';
import { CreateQuotation, Quotation, QuotationRepository } from '../domain/quotation';
import {
  CreatePayoutDto,
  CreateQuoteDto,
  KiraPayoutPageDto,
  PayoutEventViewDto,
  PayoutViewDto,
  QuotationViewDto,
} from './payouts.dto';
import { toApprovePayoutDto, toPayout, toPayoutEvent, toProviderPayoutPage, toQuotation } from './payouts.mapper';

@Injectable()
export class PayoutHttpRepository extends PayoutRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(APP_CONFIG).apiBaseUrl}/payouts`;

  list(limit: number): Observable<readonly Payout[]> {
    return this.http
      .get<PayoutViewDto[]>(this.url, { params: new HttpParams().set('limit', limit) })
      .pipe(map((dtos) => dtos.map(toPayout)));
  }

  get(id: string): Observable<Payout> {
    return this.http.get<PayoutViewDto>(`${this.url}/${encodeURIComponent(id)}`).pipe(map(toPayout));
  }

  events(id: string): Observable<readonly PayoutEvent[]> {
    return this.http
      .get<PayoutEventViewDto[]>(`${this.url}/${encodeURIComponent(id)}/events`)
      .pipe(map((dtos) => dtos.map(toPayoutEvent)));
  }

  create(command: CreatePayout): Observable<Payout> {
    const body: CreatePayoutDto = { ...command };
    return this.http.post<PayoutViewDto>(this.url, body).pipe(map(toPayout));
  }

  approve(id: string, command: ApprovePayout): Observable<Payout> {
    return this.http
      .post<PayoutViewDto>(`${this.url}/${encodeURIComponent(id)}/approve`, toApprovePayoutDto(command))
      .pipe(map(toPayout));
  }

  reject(id: string, reason: string): Observable<Payout> {
    return this.http
      .post<PayoutViewDto>(`${this.url}/${encodeURIComponent(id)}/reject`, { reason: reason.trim() })
      .pipe(map(toPayout));
  }

  refresh(id: string): Observable<Payout> {
    return this.http.post<PayoutViewDto>(`${this.url}/${encodeURIComponent(id)}/refresh`, null).pipe(map(toPayout));
  }

  providerHistory(query: ProviderHistoryQuery): Observable<ProviderPayoutPage> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.status) params = params.set('status', query.status);
    if (query.fromDate) params = params.set('fromDate', query.fromDate);
    if (query.toDate) params = params.set('toDate', query.toDate);
    return this.http.get<KiraPayoutPageDto>(`${this.url}/kira`, { params }).pipe(map(toProviderPayoutPage));
  }
}

@Injectable()
export class QuotationHttpRepository extends QuotationRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(APP_CONFIG).apiBaseUrl}/quotations`;

  create(command: CreateQuotation): Observable<Quotation> {
    const body: CreateQuoteDto = {
      virtualAccountId: command.virtualAccountId,
      recipientId: command.recipientId,
      amount: command.amount,
      ...(command.rail ? { rail: command.rail } : {}),
    };
    return this.http.post<QuotationViewDto>(this.url, body).pipe(map((dto) => toQuotation(dto)));
  }

  get(id: string): Observable<Quotation> {
    return this.http
      .get<QuotationViewDto>(`${this.url}/${encodeURIComponent(id)}`)
      .pipe(map((dto) => toQuotation(dto)));
  }
}
