import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { roleLabel, parseRole } from '../../../core/permissions/role';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { fetchRemote, loading, RemoteData } from '../../../shared/utilities/remote-data';
import { actionLabel, ActivityRepository, AuditEntry } from '../domain/activity';

/** Bitácora de auditoría: quién hizo qué, sobre qué recurso y con qué resultado. */
@Component({
  selector: 'au-audit-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, DateTimePipe],
  template: `
    <au-page-header
      title="Auditoría"
      description="Acciones registradas en la organización. Los registros no se pueden modificar ni borrar."
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
              <p class="au-notice">Todavía no hay acciones registradas.</p>
            } @else {
              <div class="au-table-wrap">
                <table class="au-table">
                  <caption class="au-visually-hidden">Bitácora de auditoría</caption>
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Acción</th>
                      <th scope="col">Quién</th>
                      <th scope="col">Recurso</th>
                      <th scope="col">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (entry of state.data; track entry.id) {
                      <tr>
                        <td>{{ entry.createdAt | auDateTime }}</td>
                        <td>{{ action(entry.action) }}</td>
                        <td>
                          @if (entry.actorName || entry.actorEmail) {
                            {{ entry.actorName ?? entry.actorEmail }}
                            <span class="sub">{{ role(entry.actorRole) }}</span>
                          } @else {
                            Sistema
                          }
                        </td>
                        <td class="au-mono">{{ entry.resourceType }} {{ entry.resourceId ?? '' }}</td>
                        <td>{{ result(entry) }}</td>
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
  styles: `
    .sub {
      display: block;
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
  `,
})
export class AuditPage implements OnInit {
  private readonly repository = inject(ActivityRepository);
  protected readonly rows = signal<RemoteData<readonly AuditEntry[]>>(loading());

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.rows.set(loading());
    this.rows.set(await fetchRemote(this.repository.audit(100)));
  }

  protected action(value: string): string {
    return actionLabel(value);
  }

  protected role(value: string | null): string {
    return value ? roleLabel(parseRole(value)) : '';
  }

  /** `detail` es el JSON de la bitácora: se muestra solo el resultado, sin datos internos. */
  protected result(entry: AuditEntry): string {
    try {
      const parsed = entry.detail ? (JSON.parse(entry.detail) as { result?: string }) : null;
      return parsed?.result === 'ERROR' ? 'Error' : parsed?.result === 'OK' ? 'Correcto' : '—';
    } catch {
      return '—';
    }
  }
}
