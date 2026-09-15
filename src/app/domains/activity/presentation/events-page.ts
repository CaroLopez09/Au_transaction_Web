import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { fetchRemote, loading, RemoteData } from '../../../shared/utilities/remote-data';
import { ActivityRepository, ProviderEvent } from '../domain/activity';

/** Centro de eventos: tabla técnica de lo que envió el proveedor y si se procesó. */
@Component({
  selector: 'au-events-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, StatusBadge, DateTimePipe],
  template: `
    <au-page-header
      title="Eventos del proveedor"
      description="Notificaciones técnicas recibidas del proveedor, con el recurso afectado y el resultado del procesamiento. No muestra su contenido."
    />
    @switch (rows().status) {
      @case ('loading') {
        <au-skeleton height="240px" />
      }
      @case ('error') {
        @if (rows(); as state) {
          @if (state.status === 'error') {
            <au-error-state [error]="state.error" (retry)="load()" />
          }
        }
      }
      @case ('success') {
        @if (rows(); as state) {
          @if (state.status === 'success') {
            @if (state.data.length === 0) {
              <p class="au-notice">Aún no se han recibido eventos del proveedor para esta organización.</p>
            } @else {
              <div class="au-table-wrap">
                <table class="au-table">
                  <caption class="au-visually-hidden">Eventos recibidos del proveedor</caption>
                  <thead>
                    <tr>
                      <th scope="col">Recibido</th>
                      <th scope="col">Evento</th>
                      <th scope="col">Recurso</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Procesamiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (event of state.data; track event.eventId) {
                      <tr>
                        <td>{{ event.receivedAt | auDateTime }}</td>
                        <td class="au-mono">{{ event.eventType }}</td>
                        <td class="au-mono">{{ event.resourceId ?? '—' }}</td>
                        <td>{{ event.status ?? '—' }}</td>
                        <td>
                          <au-status-badge
                            [label]="processing(event).label"
                            [tone]="processing(event).tone"
                            [technicalValue]="event.processingError"
                          />
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
        }
      }
    }
  `,
})
export class EventsPage implements OnInit {
  private readonly repository = inject(ActivityRepository);
  protected readonly rows = signal<RemoteData<readonly ProviderEvent[]>>(loading());

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.rows.set(loading());
    this.rows.set(await fetchRemote(this.repository.events(100)));
  }

  protected processing(event: ProviderEvent): { label: string; tone: 'success' | 'attention' | 'critical' } {
    if (event.processed) {
      return { label: 'Procesado', tone: 'success' };
    }
    return event.retryCount >= 5
      ? { label: 'Falló (sin más reintentos)', tone: 'critical' }
      : { label: `Pendiente (${event.retryCount} reintentos)`, tone: 'attention' };
  }
}
