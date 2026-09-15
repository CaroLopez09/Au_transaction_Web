import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/configuration/app-config';
import { ProviderRecipient, Recipient, RecipientRepository, RegisterRecipient } from '../domain/recipient';
import { KiraRecipientViewDto, RecipientViewDto } from './recipient.dto';
import { toProviderRecipient, toRecipient, toRegisterRecipientDto } from './recipient.mapper';

@Injectable()
export class RecipientHttpRepository extends RecipientRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(APP_CONFIG).apiBaseUrl}/recipients`;

  list(): Observable<readonly Recipient[]> {
    return this.http.get<RecipientViewDto[]>(this.url).pipe(map((dtos) => dtos.map(toRecipient)));
  }

  get(id: string): Observable<Recipient> {
    return this.http.get<RecipientViewDto>(`${this.url}/${encodeURIComponent(id)}`).pipe(map(toRecipient));
  }

  listInProvider(): Observable<readonly ProviderRecipient[]> {
    return this.http.get<KiraRecipientViewDto[]>(`${this.url}/kira`).pipe(map((dtos) => dtos.map(toProviderRecipient)));
  }

  register(command: RegisterRecipient, idempotencyKey: string): Observable<Recipient> {
    return this.http
      .post<RecipientViewDto>(this.url, toRegisterRecipientDto(command), {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .pipe(map(toRecipient));
  }

  archive(id: string, replacedByRecipientId: string | null): Observable<Recipient> {
    const body = replacedByRecipientId ? { replacedByRecipientId } : null;
    return this.http
      .post<RecipientViewDto>(`${this.url}/${encodeURIComponent(id)}/archive`, body)
      .pipe(map(toRecipient));
  }
}
