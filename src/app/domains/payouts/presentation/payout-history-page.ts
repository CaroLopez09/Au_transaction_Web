import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { dataOf, errorOf } from '../../../shared/utilities/remote-data';
import { PayoutsFacade } from '../application/payouts.facade';
import { PROVIDER_STATUS_FILTERS, ProviderHistoryQuery } from '../domain/payout';

const PAGE_SIZE = 20;

@Component({
  selector: 'au-payout-history-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, MoneyPipe, DateTimePipe, RouterLink, ReactiveFormsModule],
  providers: [PayoutsFacade],
  template: `
    <nav class="crumbs" aria-label="Ruta">
      <a routerLink="/pagos">Pagos</a>
      <span aria-hidden="true">/</span>
      <span aria-current="page">Historial en el proveedor</span>
    </nav>

    <au-page-header
      title="Historial en el proveedor"
      description="Todos los pagos de la empresa según el proveedor bancario, incluidos los que no nacieron en este portal."
    />

    <form class="filters" [formGroup]="filters" (ngSubmit)="apply()" role="search" aria-label="Filtrar historial">
      <div class="au-field">
        <label class="au-label" for="history-status">Estado en el proveedor</label>
        <select id="history-status" class="au-input" formControlName="status">
          <option value="">Todos</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ status }}</option>
          }
        </select>
      </div>
      <div class="au-field">
        <label class="au-label" for="history-from">Desde</label>
        <input id="history-from" class="au-input" type="date" formControlName="fromDate" />
      </div>
      <div class="au-field">
        <label class="au-label" for="history-to">Hasta</label>
        <input id="history-to" class="au-input" type="date" formControlName="toDate" />
      </div>
      <button type="submit" class="au-button au-button--secondary">Aplicar</button>
    </form>

    @switch (facade.history().status) {
      @case ('loading') {
        <au-skeleton height="240px" />
      }
      @case ('error') {
        @if (error(); as failure) {
          <au-error-state [error]="failure" (retry)="load()" />
        }
      }
      @case ('success') {
        @if (page(); as result) {
          @if (result.items.length === 0) {
            <p class="au-notice">El proveedor no tiene pagos con estos filtros.</p>
          } @else {
            <div class="au-table-wrap">
              <table class="au-table">
                <caption class="au-visually-hidden">
                  Pagos en el proveedor, página
                  {{
                    result.page
                  }}
                  de
                  {{
                    result.totalPages
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Destinatario</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Origen</th>
                    <th scope="col">Referencia</th>
                    <th scope="col" class="au-cell-amount">Sale</th>
                    <th scope="col" class="au-cell-amount">Llega</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of result.items; track item.providerPayoutId ?? $index) {
                    <tr>
                      <td class="nowrap">{{ item.createdAt | auDateTime }}</td>
                      <td>
                        @if (item.localPayoutId) {
                          <a [routerLink]="['/pagos', item.localPayoutId]">{{ item.recipientName ?? 'Ver pago' }}</a>
                        } @else {
                          {{ item.recipientName ?? '—' }}
                        }
                      </td>
                      <td>{{ item.status ?? '—' }}</td>
                      <td>{{ item.localPayoutId ? 'Este portal' : (item.origin ?? 'Fuera del portal') }}</td>
                      <td class="au-mono">{{ item.reference ?? item.shortId ?? '—' }}</td>
                      <td class="au-cell-amount">{{ item.fromAmount | auMoney: item.fromCurrency }}</td>
                      <td class="au-cell-amount">{{ item.toAmount | auMoney: item.toCurrency }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <nav class="pager" aria-label="Paginación">
              <button
                type="button"
                class="au-button au-button--secondary"
                [disabled]="result.page <= 1"
                (click)="go(result.page - 1)"
              >
                Anterior
              </button>
              <span aria-live="polite"
                >Página {{ result.page }} de {{ result.totalPages }} · {{ result.total }} pagos</span
              >
              <button
                type="button"
                class="au-button au-button--secondary"
                [disabled]="result.page >= result.totalPages"
                (click)="go(result.page + 1)"
              >
                Siguiente
              </button>
            </nav>
          }
        }
      }
    }
  `,
  styles: `
    .crumbs {
      display: flex;
      gap: var(--au-space-2);
      margin-bottom: var(--au-space-4);
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
    .crumbs a {
      color: var(--au-text-body);
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0 var(--au-space-4);
      margin-bottom: var(--au-space-5);
    }
    .filters .au-field {
      min-width: 180px;
      margin-bottom: var(--au-space-3);
    }
    .filters .au-button {
      margin-bottom: var(--au-space-3);
    }
    .nowrap {
      white-space: nowrap;
    }
    .pager {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--au-space-3);
      margin-top: var(--au-space-4);
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
  `,
})
export class PayoutHistoryPage implements OnInit {
  protected readonly facade = inject(PayoutsFacade);
  protected readonly statuses = PROVIDER_STATUS_FILTERS;
  protected readonly filters = inject(FormBuilder).nonNullable.group({ status: [''], fromDate: [''], toDate: [''] });
  private readonly query = signal<ProviderHistoryQuery>({
    status: null,
    page: 1,
    limit: PAGE_SIZE,
    fromDate: null,
    toDate: null,
  });

  protected readonly error = computed(() => errorOf(this.facade.history()));
  protected readonly page = computed(() => dataOf(this.facade.history()));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    void this.facade.loadHistory(this.query());
  }

  protected apply(): void {
    const value = this.filters.getRawValue();
    this.query.set({
      status: value.status || null,
      fromDate: value.fromDate || null,
      toDate: value.toDate || null,
      page: 1,
      limit: PAGE_SIZE,
    });
    this.load();
  }

  protected go(page: number): void {
    this.query.update((query) => ({ ...query, page }));
    this.load();
  }
}
