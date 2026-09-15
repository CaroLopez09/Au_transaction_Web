import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { UserFacingError } from '../../../core/http/error-mapping';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { dataOf, errorOf } from '../../../shared/utilities/remote-data';
import { OnboardingFacade } from '../../onboarding/application/onboarding.facade';
import { RfisFacade } from '../application/rfis.facade';
import { Rfi } from '../domain/rfi';
import { blockingCopy, rfiStatusCopy } from './rfi-copy';

@Component({
  selector: 'au-rfis-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, StatusBadge, DateTimePipe, RouterLink],
  providers: [RfisFacade],
  template: `
    <au-page-header
      title="Solicitudes de información"
      description="Preguntas y documentos que pide el proveedor bancario. Una solicitud sin responder detiene lo que bloquea hasta que vence."
    >
      @if (canManage() && registered()) {
        <button
          type="button"
          class="au-button au-button--secondary"
          [disabled]="facade.busy() === 'sync'"
          [attr.aria-busy]="facade.busy() === 'sync'"
          (click)="sync()"
        >
          {{ facade.busy() === 'sync' ? 'Consultando…' : 'Traer del proveedor' }}
        </button>
      }
    </au-page-header>

    <fieldset class="filter">
      <legend class="au-visually-hidden">Mostrar</legend>
      <div class="au-choice">
        <label
          ><input type="radio" name="rfi-filter" [checked]="onlyOpen()" (change)="setFilter(true)" />Abiertas</label
        >
        <label><input type="radio" name="rfi-filter" [checked]="!onlyOpen()" (change)="setFilter(false)" />Todas</label>
      </div>
    </fieldset>

    <div aria-live="assertive">
      @if (syncError(); as failure) {
        <au-error-state class="sync-error" [error]="failure" />
      }
    </div>

    @switch (facade.list().status) {
      @case ('loading') {
        <au-skeleton height="180px" />
      }
      @case ('error') {
        @if (error(); as failure) {
          <au-error-state [error]="failure" (retry)="facade.loadList(onlyOpen())" />
        }
      }
      @case ('success') {
        @if (list().length === 0) {
          <section class="au-empty" aria-labelledby="rfis-empty">
            <h2 id="rfis-empty">{{ onlyOpen() ? 'No hay solicitudes abiertas' : 'No hay solicitudes' }}</h2>
            <p>
              El proveedor crea las solicitudes cuando necesita información para verificar a la empresa, un pago o un
              depósito. Cuando llegue una, aparecerá aquí.
            </p>
          </section>
        } @else {
          <ul class="rfis" aria-label="Solicitudes">
            @for (rfi of list(); track rfi.id) {
              <li>
                <a class="rfi" [routerLink]="['/solicitudes', rfi.id]">
                  <span class="main">
                    <span class="title">
                      {{ rfi.totalItems }} {{ rfi.totalItems === 1 ? 'requerimiento' : 'requerimientos' }}
                      @if (rfi.pendingItems > 0) {
                        · {{ rfi.pendingItems }} {{ rfi.pendingItems === 1 ? 'pendiente' : 'pendientes' }}
                      }
                    </span>
                    <span class="meta">
                      @if (rfi.blocking) {
                        {{ blocking(rfi.blocking.type) }} ·
                      }
                      @if (rfi.dueDate) {
                        Vence {{ rfi.dueDate | auDateTime: 'date' }}
                      } @else {
                        Sin fecha límite informada
                      }
                    </span>
                  </span>
                  <au-status-badge
                    [label]="status(rfi).label"
                    [tone]="status(rfi).tone"
                    [technicalValue]="rfi.rawStatus"
                  />
                </a>
              </li>
            }
          </ul>
        }
      }
    }
  `,
  styles: `
    .filter {
      margin: 0 0 var(--au-space-5);
      padding: 0;
      border: 0;
    }
    .sync-error {
      margin-bottom: var(--au-space-5);
    }
    .rfis {
      list-style: none;
      margin: 0;
      padding: 0;
      border-top: 1px solid var(--au-hairline);
    }
    .rfis li {
      border-bottom: 1px solid var(--au-hairline);
    }
    .rfi {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--au-space-4);
      padding: var(--au-space-4) var(--au-space-3);
      color: inherit;
      text-decoration: none;
    }
    .rfi:hover {
      background: var(--au-surface-sunken);
    }
    .main {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .title {
      color: var(--au-primary);
      font-weight: 500;
    }
    .meta {
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
  `,
})
export class RfisPage implements OnInit {
  protected readonly facade = inject(RfisFacade);
  private readonly session = inject(SessionStore);
  private readonly onboarding = inject(OnboardingFacade);

  protected readonly onlyOpen = signal(true);
  protected readonly canManage = computed(() => this.session.can('rfis.manage'));
  /** POST /api/rfis/sync exige la empresa dada de alta en el proveedor (si no, 422). */
  protected readonly registered = computed(() => dataOf(this.onboarding.status())?.providerUserId != null);
  protected readonly error = computed(() => errorOf(this.facade.list()));
  protected readonly list = computed(() => {
    const all = dataOf(this.facade.list()) ?? [];
    // sync devuelve todas: se respeta el filtro elegido.
    return this.onlyOpen() ? all.filter((rfi) => rfi.open) : all;
  });
  protected readonly syncError = signal<UserFacingError | null>(null);

  ngOnInit(): void {
    void this.facade.loadList(true);
    if (this.onboarding.status().status !== 'success') {
      this.onboarding.reloadStatus();
    }
  }

  protected setFilter(onlyOpen: boolean): void {
    this.onlyOpen.set(onlyOpen);
    void this.facade.loadList(onlyOpen);
  }

  protected async sync(): Promise<void> {
    this.syncError.set(null);
    const result = await this.facade.sync();
    if (result && !result.ok) {
      this.syncError.set(result.error);
    }
  }

  protected status(rfi: Rfi) {
    return rfiStatusCopy(rfi);
  }

  protected blocking(type: string): string {
    return blockingCopy(type);
  }
}
