import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/configuration/app-config';
import { toDate } from '../../../shared/utilities/dates';
import { ItemAnswer, Rfi, RfiRepository, TemporaryLink } from '../domain/rfi';
import { RfiDocumentLinkDto, RfiUboLinkDto, RfiViewDto } from './rfi.dto';
import { toRfi } from './rfi.mapper';

@Injectable()
export class RfiHttpRepository extends RfiRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(APP_CONFIG).apiBaseUrl}/rfis`;

  list(onlyOpen: boolean): Observable<readonly Rfi[]> {
    return this.http
      .get<RfiViewDto[]>(this.url, { params: new HttpParams().set('open', onlyOpen) })
      .pipe(map((dtos) => dtos.map(toRfi)));
  }

  get(id: string): Observable<Rfi> {
    return this.http.get<RfiViewDto>(this.itemUrl(id)).pipe(map(toRfi));
  }

  sync(): Observable<readonly Rfi[]> {
    return this.http.post<RfiViewDto[]>(`${this.url}/sync`, null).pipe(map((dtos) => dtos.map(toRfi)));
  }

  refresh(id: string): Observable<Rfi> {
    return this.http.post<RfiViewDto>(`${this.itemUrl(id)}/refresh`, null).pipe(map(toRfi));
  }

  answer(id: string, answers: readonly ItemAnswer[]): Observable<Rfi> {
    const body = { items: answers.map((answer) => ({ itemId: answer.itemId, answerValue: answer.value })) };
    return this.http.patch<RfiViewDto>(`${this.itemUrl(id)}/items`, body).pipe(map(toRfi));
  }

  uploadDocuments(id: string, itemId: string, files: readonly File[]): Observable<Rfi> {
    const form = new FormData();
    files.forEach((file) => form.append('files', file, file.name));
    return this.http
      .post<RfiViewDto>(`${this.itemUrl(id)}/items/${encodeURIComponent(itemId)}/documents`, form)
      .pipe(map(toRfi));
  }

  removeDocument(id: string, itemId: string, documentId: string): Observable<Rfi> {
    return this.http
      .delete<RfiViewDto>(
        `${this.itemUrl(id)}/items/${encodeURIComponent(itemId)}/documents/${encodeURIComponent(documentId)}`,
      )
      .pipe(map(toRfi));
  }

  documentLink(id: string, itemId: string, documentId: string): Observable<TemporaryLink> {
    return this.http
      .get<RfiDocumentLinkDto>(
        `${this.itemUrl(id)}/items/${encodeURIComponent(itemId)}/documents/${encodeURIComponent(documentId)}/link`,
      )
      .pipe(map((dto) => ({ url: dto.downloadUrl, expiresAt: toDate(dto.expiresAt) })));
  }

  ownerVerificationLink(id: string, itemId: string): Observable<TemporaryLink> {
    return this.http
      .post<RfiUboLinkDto>(`${this.itemUrl(id)}/items/${encodeURIComponent(itemId)}/ubo-link`, null)
      .pipe(map((dto) => ({ url: dto.url, expiresAt: toDate(dto.expiresAt) })));
  }

  private itemUrl(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }
}
