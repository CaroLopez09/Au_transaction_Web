import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG } from '../../../core/configuration/app-config';
import { toDate } from '../../../shared/utilities/dates';
import {
  ActivityRepository,
  AppNotification,
  AuditEntry,
  NotificationFeed,
  NotificationSeverity,
  ProviderEvent,
} from '../domain/activity';

interface NotificationDto {
  id: string;
  kind: string;
  severity: string;
  title: string;
  message?: string;
  resourceType?: string;
  resourceId?: string;
  createdAt?: string;
  unread: boolean;
}

interface EventDto {
  eventId: string;
  eventType: string;
  resourceId?: string;
  status?: string;
  processed: boolean;
  processingError?: string;
  retryCount: number;
  exhausted: boolean;
  receivedAt?: string;
  processedAt?: string;
}

interface AuditDto {
  id: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  detail?: string;
  createdAt?: string;
}

const SEVERITIES: readonly NotificationSeverity[] = ['info', 'success', 'attention', 'critical'];

@Injectable()
export class ActivityHttpRepository extends ActivityRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_CONFIG).apiBaseUrl;

  notifications(limit: number): Observable<NotificationFeed> {
    return this.http
      .get<{ items?: NotificationDto[]; unread: number }>(`${this.baseUrl}/notifications`, {
        params: new HttpParams().set('limit', limit),
      })
      .pipe(map((dto) => ({ items: (dto.items ?? []).map(toNotification), unread: dto.unread })));
  }

  unreadCount(): Observable<number> {
    return this.http
      .get<{ unread: number }>(`${this.baseUrl}/notifications/unread-count`)
      .pipe(map((dto) => dto.unread));
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/notifications/read`, null);
  }

  events(limit: number): Observable<readonly ProviderEvent[]> {
    return this.http
      .get<EventDto[]>(`${this.baseUrl}/events`, { params: new HttpParams().set('limit', limit) })
      .pipe(map((dtos) => dtos.map(toProviderEvent)));
  }

  incidents(limit: number): Observable<readonly ProviderEvent[]> {
    return this.http
      .get<EventDto[]>(`${this.baseUrl}/events/incidents`, { params: new HttpParams().set('limit', limit) })
      .pipe(map((dtos) => dtos.map(toProviderEvent)));
  }

  retryEvent(eventId: string): Observable<ProviderEvent> {
    return this.http
      .post<EventDto>(`${this.baseUrl}/events/${eventId}/retry`, null)
      .pipe(map(toProviderEvent));
  }

  audit(limit: number): Observable<readonly AuditEntry[]> {
    return this.http
      .get<AuditDto[]>(`${this.baseUrl}/audit`, { params: new HttpParams().set('limit', limit) })
      .pipe(
        map((dtos) =>
          dtos.map((dto) => ({
            id: dto.id,
            action: dto.action,
            resourceType: dto.resourceType ?? null,
            resourceId: dto.resourceId ?? null,
            actorName: dto.actorName ?? null,
            actorEmail: dto.actorEmail ?? null,
            actorRole: dto.actorRole ?? null,
            detail: dto.detail ?? null,
            createdAt: toDate(dto.createdAt),
          })),
        ),
      );
  }
}

export function toNotification(dto: NotificationDto): AppNotification {
  const severity = SEVERITIES.includes(dto.severity as NotificationSeverity)
    ? (dto.severity as NotificationSeverity)
    : 'info';
  return {
    id: dto.id,
    kind: dto.kind,
    severity,
    title: dto.title,
    message: dto.message ?? null,
    resourceType: dto.resourceType ?? null,
    resourceId: dto.resourceId ?? null,
    createdAt: toDate(dto.createdAt),
    unread: dto.unread,
  };
}

function toProviderEvent(dto: EventDto): ProviderEvent {
  return {
    eventId: dto.eventId,
    eventType: dto.eventType,
    resourceId: dto.resourceId ?? null,
    status: dto.status ?? null,
    processed: dto.processed,
    processingError: dto.processingError ?? null,
    retryCount: dto.retryCount,
    exhausted: dto.exhausted,
    receivedAt: toDate(dto.receivedAt),
    processedAt: toDate(dto.processedAt),
  };
}
