import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { SessionStore } from '../../../core/auth/session.store';
import { EnvironmentCapabilities } from '../../../core/configuration/environment-capabilities';
import { UserFacingError } from '../../../core/http/error-mapping';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { fetchRemote, loading, RemoteData } from '../../../shared/utilities/remote-data';
import { ActivityRepository, ProviderEvent } from '../domain/activity';

/**
 * Centro de eventos y panel de incidencias de integración: qué envió el proveedor, si se
 * procesó y, cuando falló del todo, cómo retomarlo (reintentar ahora o escalar a soporte).
 */
@Component({
  selector: 'au-events-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, StatusBadge, DateTimePipe],
  template: `
    <au-page-header
      title="Eventos del proveedor"
      description="Notificaciones técnicas recibidas del proveedor, con el recurso afectado y el resultado del procesamiento. No muestra su contenido."
    />

    <div class="au-choice" role="group" aria-label="Filtro">
      <button
        type="button"
        class="au-button"
        [class.au-button--primary]="!onlyIncidents()"
        [class.au-button--secondary]="onlyIncidents()"
        [attr.aria-pressed]="!onlyIncidents()"
        (click)="showAll()"
      >
        Todos
      </button>
      <button
        type="button"
        class="au-button"
        [class.au-button--primary]="onlyIncidents()"
        [class.au-button--secondary]="!onlyIncidents()"
        [attr.aria-pressed]="onlyIncidents()"
        (click)="showIncidents()"
      >
        Solo incidencias
      </button>
    </div>

    @if (retryError(); as failure) {
      <au-error-state class="error" [error]="failure" />
    }

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
              <p class="au-notice">
                {{
                  onlyIncidents()
                    ? 'No hay incidencias de integración: todos los eventos recibidos se procesaron.'
                    : 'Aún no se han recibido eventos del proveedor para esta organización.'
                }}
              </p>
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
                      @if (canManage()) {
                        <th scope="col">Acciones</th>
                      }
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
                        @if (canManage()) {
                          <td class="actions-cell">
                            @if (!event.processed) {
                              <button
                                type="button"
                                class="au-button au-button--secondary"
                                [disabled]="retrying() === event.eventId"
                                [attr.aria-busy]="retrying() === event.eventId"
                                (click)="retry(event.eventId)"
                              >
                                {{ retrying() === event.eventId ? 'Reintentando…' : 'Reintentar ahora' }}
                              </button>
                            }
                            @if (event.exhausted && supportMailto(event); as mailto) {
                              <a class="au-button au-button--secondary" [href]="mailto">Escalar a soporte</a>
                            }
                          </td>
                        }
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
  private readonly session = inject(SessionStore);
  private readonly environment = inject(EnvironmentCapabilities);

  protected readonly rows = signal<RemoteData<readonly ProviderEvent[]>>(loading());
  protected readonly onlyIncidents = signal(false);
  protected readonly retrying = signal<string | null>(null);
  protected readonly retryError = signal<UserFacingError | null>(null);
  protected readonly canManage = computed(() => this.session.can('activity.manageIncidents'));

  ngOnInit(): void {
    void this.load();
  }

  protected showAll(): void {
    if (this.onlyIncidents()) {
      this.onlyIncidents.set(false);
      void this.load();
    }
  }

  protected showIncidents(): void {
    if (!this.onlyIncidents()) {
      this.onlyIncidents.set(true);
      void this.load();
    }
  }

  protected async load(): Promise<void> {
    this.rows.set(loading());
    this.retryError.set(null);
    const source = this.onlyIncidents() ? this.repository.incidents(100) : this.repository.events(100);
    this.rows.set(await fetchRemote(source));
  }

  protected async retry(eventId: string): Promise<void> {
    if (this.retrying()) {
      return;
    }
    this.retrying.set(eventId);
    this.retryError.set(null);
    const result = await fetchRemote(this.repository.retryEvent(eventId));
    this.retrying.set(null);
    if (result.status === 'error') {
      this.retryError.set(result.error);
      return;
    }
    void this.load();
  }

  protected processing(event: ProviderEvent): { label: string; tone: 'success' | 'attention' | 'critical' } {
    if (event.processed) {
      return { label: 'Procesado', tone: 'success' };
    }
    return event.exhausted
      ? { label: 'Falló (sin más reintentos)', tone: 'critical' }
      : { label: `Pendiente (${event.retryCount} reintentos)`, tone: 'attention' };
  }

  /** Sin bff.support.email configurado no se ofrece el enlace: mejor nada que un correo vacío. */
  protected supportMailto(event: ProviderEvent): string | null {
    const email = this.environment.info().supportEmail;
    if (!email) {
      return null;
    }
    const subject = encodeURIComponent(`Incidencia de integración: ${event.eventType} (${event.eventId})`);
    const body = encodeURIComponent(
      `El evento ${event.eventId} (${event.eventType}) agotó sus reintentos automáticos.\n` +
        `Recurso: ${event.resourceId ?? 'sin recurso asociado'}\n` +
        `Último error: ${event.processingError ?? 'sin detalle'}\n` +
        `Recibido: ${event.receivedAt?.toISOString() ?? 'desconocido'}`,
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }
}
