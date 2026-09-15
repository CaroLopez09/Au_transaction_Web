import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge, StatusTone } from '../../../shared/ui/status-badge';
import { fetchRemote, loading, RemoteData } from '../../../shared/utilities/remote-data';
import { ActivityRepository, AppNotification, NotificationFeed, notificationLink } from '../domain/activity';
import { UnreadNotifications } from './unread-notifications';

const TONE: Record<AppNotification['severity'], StatusTone> = {
  info: 'neutral',
  success: 'success',
  attention: 'attention',
  critical: 'critical',
};

@Component({
  selector: 'au-notifications-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, StatusBadge, DateTimePipe, RouterLink],
  template: `
    <au-page-header
      title="Avisos"
      description="Cambios que envía el proveedor: verificación, cuentas, depósitos, pagos y solicitudes de información."
    />
    @switch (feed().status) {
      @case ('loading') {
        <au-skeleton height="240px" />
      }
      @case ('error') {
        @if (feed(); as state) {
          @if (state.status === 'error') {
            <au-error-state [error]="state.error" (retry)="load()" />
          }
        }
      }
      @case ('success') {
        @if (feed(); as state) {
          @if (state.status === 'success') {
            @if (state.data.items.length === 0) {
              <section class="au-empty" aria-labelledby="no-notifications">
                <h2 id="no-notifications">Sin avisos</h2>
                <p>Aquí aparecerán los cambios importantes a medida que el proveedor los comunique.</p>
              </section>
            } @else {
              <ul class="list">
                @for (item of state.data.items; track item.id) {
                  <li [class.unread]="item.unread">
                    <au-status-badge [label]="item.unread ? 'Nuevo' : 'Visto'" [tone]="tone(item)" />
                    <div class="body">
                      <p class="title">{{ item.title }}</p>
                      @if (item.message) {
                        <p class="message">{{ item.message }}</p>
                      }
                      <p class="meta">{{ item.createdAt | auDateTime }}</p>
                    </div>
                    @if (link(item); as path) {
                      <a class="au-button au-button--quiet" [routerLink]="path">Ver</a>
                    }
                  </li>
                }
              </ul>
            }
          }
        }
      }
    }
  `,
  styles: `
    .list {
      display: grid;
      gap: var(--au-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: var(--au-space-3);
      align-items: start;
      padding: var(--au-space-3) var(--au-space-4);
      border: 1px solid var(--au-border);
      border-radius: var(--au-radius-md, 10px);
      background: var(--au-surface);
    }
    li.unread {
      border-left: 3px solid var(--au-accent, currentColor);
    }
    .title {
      margin: 0;
      font-weight: 600;
    }
    .message,
    .meta {
      margin: var(--au-space-1) 0 0;
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
    @media (max-width: 640px) {
      li {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class NotificationsPage implements OnInit {
  private readonly repository = inject(ActivityRepository);
  private readonly unread = inject(UnreadNotifications);
  protected readonly feed = signal<RemoteData<NotificationFeed>>(loading());

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.feed.set(loading());
    const result = await fetchRemote(this.repository.notifications(50));
    this.feed.set(result);
    if (result.status === 'success' && result.data.unread > 0) {
      // Abrir la bandeja cuenta como verlos; la lista conserva "Nuevo" en esta visita.
      try {
        await firstValueFrom(this.repository.markAllRead());
        this.unread.clear();
      } catch {
        // Si falla, el contador sigue y se reintenta en la próxima visita.
      }
    }
  }

  protected tone(item: AppNotification): StatusTone {
    return item.unread ? TONE[item.severity] : 'neutral';
  }

  protected link(item: AppNotification): string | null {
    return notificationLink(item);
  }
}
