import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { dataOf, errorOf } from '../../../shared/utilities/remote-data';
import { AccountsFacade } from '../../accounts/application/accounts.facade';
import { accountLabel } from '../../accounts/presentation/account-label';
import { DepositsFacade } from '../application/deposits.facade';
import { DepositStatus, Rail } from '../domain/deposit';
import { depositStatusCopy, HELD_DEPOSITS_NOTICE, RAIL_LABELS } from './deposit-copy';
import { DepositTable } from './deposit-table';

const STATUSES: DepositStatus[] = ['PENDING', 'COMPLETED', 'KYT_PENDING', 'KYT_REJECTED', 'FAILED', 'REFUNDED'];
const RAILS: Rail[] = ['ACH', 'WIRE', 'WALLET'];

@Component({
  selector: 'au-deposits-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, DepositTable, RouterLink],
  providers: [DepositsFacade, AccountsFacade],
  template: `
    <au-page-header
      title="Depósitos"
      description="Fondos recibidos en las cuentas virtuales de la organización, con lo enviado, la comisión y lo acreditado."
    />

    @switch (facade.deposits().status) {
      @case ('loading') {
        <au-skeleton height="240px" />
      }
      @case ('error') {
        @if (error(); as failure) {
          <au-error-state [error]="failure" (retry)="facade.loadAll()" />
        }
      }
      @case ('success') {
        @if (all().length === 0) {
          <section class="au-empty" aria-labelledby="deposits-empty">
            <h2 id="deposits-empty">Aún no hay depósitos</h2>
            <p>
              Los depósitos aparecen cuando el banco acredita fondos en una cuenta virtual operativa. Las instrucciones
              para recibirlos están en el detalle de cada cuenta.
            </p>
            <a class="au-button au-button--secondary" routerLink="/cuentas">Ver cuentas</a>
          </section>
        } @else {
          @if (hasHeld()) {
            <p class="au-notice" role="status">{{ heldNotice }}</p>
          }
          <form class="filters" role="search" aria-label="Filtrar depósitos" (submit)="$event.preventDefault()">
            <div class="au-field">
              <label class="au-label" for="deposit-status">Estado</label>
              <select id="deposit-status" class="au-input" (change)="statusFilter.set(value($event))">
                <option value="">Todos</option>
                @for (status of statuses; track status) {
                  <option [value]="status">{{ statusLabel(status) }}</option>
                }
              </select>
            </div>
            <div class="au-field">
              <label class="au-label" for="deposit-rail">Riel</label>
              <select id="deposit-rail" class="au-input" (change)="railFilter.set(value($event))">
                <option value="">Todos</option>
                @for (rail of rails; track rail) {
                  <option [value]="rail">{{ railLabels[rail] }}</option>
                }
              </select>
            </div>
            @if (accountOptions().length > 1) {
              <div class="au-field">
                <label class="au-label" for="deposit-account">Cuenta</label>
                <select id="deposit-account" class="au-input" (change)="accountFilter.set(value($event))">
                  <option value="">Todas</option>
                  @for (option of accountOptions(); track option.id) {
                    <option [value]="option.id">{{ option.label }}</option>
                  }
                </select>
              </div>
            }
          </form>
          <p class="scope" aria-live="polite">
            {{ filtered().length }} de {{ all().length }} depósitos.
            @if (all().length >= facade.limit) {
              Se muestran los {{ facade.limit }} más recientes: el servidor no ofrece movimientos anteriores en esta
              vista.
            }
          </p>
          @if (filtered().length === 0) {
            <p class="au-notice">Ningún depósito coincide con los filtros.</p>
          } @else {
            <au-deposit-table [deposits]="filtered()" [accountNames]="accountNames()" caption="Depósitos recibidos" />
          }
        }
      }
    }
  `,
  styles: `
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0 var(--au-space-4);
    }
    .filters .au-field {
      min-width: 180px;
      margin-bottom: var(--au-space-3);
    }
    .scope {
      margin-bottom: var(--au-space-4);
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
  `,
})
export class DepositsPage implements OnInit {
  protected readonly facade = inject(DepositsFacade);
  private readonly accounts = inject(AccountsFacade);

  protected readonly statuses = STATUSES;
  protected readonly rails = RAILS;
  protected readonly railLabels = RAIL_LABELS;
  protected readonly statusFilter = signal('');
  protected readonly railFilter = signal('');
  protected readonly accountFilter = signal('');

  protected readonly error = computed(() => errorOf(this.facade.deposits()));
  protected readonly all = computed(() => dataOf(this.facade.deposits()) ?? []);
  protected readonly hasHeld = computed(() => this.all().some((deposit) => deposit.held));
  protected readonly heldNotice = HELD_DEPOSITS_NOTICE;
  protected readonly accountOptions = computed(() =>
    (dataOf(this.accounts.accounts()) ?? []).map((account) => ({ id: account.id, label: accountLabel(account) })),
  );
  /** Sin la lista de cuentas (error o carga) la columna muestra un texto genérico, no un id. */
  protected readonly accountNames = computed(() =>
    Object.fromEntries(this.accountOptions().map((option) => [option.id, option.label])),
  );
  protected readonly filtered = computed(() =>
    this.all().filter(
      (deposit) =>
        (!this.statusFilter() || deposit.status === this.statusFilter()) &&
        (!this.railFilter() || deposit.rail === this.railFilter()) &&
        (!this.accountFilter() || deposit.virtualAccountId === this.accountFilter()),
    ),
  );

  ngOnInit(): void {
    void this.facade.loadAll();
    void this.accounts.loadList();
  }

  protected statusLabel(status: DepositStatus): string {
    return depositStatusCopy(status).label;
  }

  protected value(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }
}
