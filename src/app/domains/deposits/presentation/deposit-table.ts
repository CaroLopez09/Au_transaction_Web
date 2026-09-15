import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { maskTail } from '../../../shared/utilities/mask';
import { Deposit } from '../domain/deposit';
import { depositStatusCopy, RAIL_LABELS } from './deposit-copy';

@Component({
  selector: 'au-deposit-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadge, MoneyPipe, DateTimePipe, RouterLink],
  template: `
    <div class="au-table-wrap au-only-desktop">
      <table class="au-table">
        <caption class="au-visually-hidden">
          {{
            caption()
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            @if (accountNames()) {
              <th scope="col">Cuenta</th>
            }
            <th scope="col">Ordenante</th>
            <th scope="col">Riel</th>
            <th scope="col">Estado</th>
            <th scope="col" class="au-cell-amount">Bruto</th>
            <th scope="col" class="au-cell-amount">Comisión</th>
            <th scope="col" class="au-cell-amount">Neto</th>
          </tr>
        </thead>
        <tbody>
          @for (deposit of deposits(); track deposit.id) {
            <tr>
              <td class="nowrap">{{ deposit.createdAt | auDateTime }}</td>
              @if (accountNames(); as names) {
                <td>
                  <a [routerLink]="['/cuentas', deposit.virtualAccountId]">{{
                    names[deposit.virtualAccountId] ?? 'Cuenta'
                  }}</a>
                </td>
              }
              <td>
                <span class="au-cell-strong">{{ deposit.senderName ?? 'Ordenante no informado' }}</span>
                @if (deposit.senderAccount) {
                  <span class="sub au-num">{{ mask(deposit.senderAccount) }}</span>
                }
                @if (deposit.microdeposit) {
                  <span class="sub">Microdepósito de verificación</span>
                }
              </td>
              <td>{{ deposit.rail ? rails[deposit.rail] : '—' }}</td>
              <td>
                <au-status-badge
                  [label]="status(deposit.status).label"
                  [tone]="status(deposit.status).tone"
                  [technicalValue]="deposit.rawStatus"
                />
              </td>
              <td class="au-cell-amount">{{ deposit.grossAmount | auMoney: deposit.currency }}</td>
              <td class="au-cell-amount">{{ deposit.feeAmount | auMoney: deposit.currency }}</td>
              <td class="au-cell-amount">{{ deposit.netAmount | auMoney: deposit.currency }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <ul class="au-stack au-only-mobile" [attr.aria-label]="caption()">
      @for (deposit of deposits(); track deposit.id) {
        <li class="row">
          <div>
            <p class="au-cell-strong">{{ deposit.senderName ?? 'Ordenante no informado' }}</p>
            <p class="sub">
              {{ deposit.createdAt | auDateTime }} · {{ deposit.rail ? rails[deposit.rail] : 'Riel no informado' }}
            </p>
            <au-status-badge [label]="status(deposit.status).label" [tone]="status(deposit.status).tone" />
          </div>
          <div class="amounts">
            <p class="au-num net">{{ deposit.netAmount ?? deposit.grossAmount | auMoney: deposit.currency }}</p>
            <p class="sub au-num">Bruto {{ deposit.grossAmount | auMoney: deposit.currency }}</p>
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .nowrap {
      white-space: nowrap;
    }
    .sub {
      display: block;
      margin-top: 2px;
      color: var(--au-text-muted);
      font-size: var(--au-fs-caption);
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: var(--au-space-4);
    }
    .row au-status-badge {
      margin-top: var(--au-space-2);
    }
    .amounts {
      text-align: right;
    }
    .net {
      color: var(--au-primary);
      font-weight: 500;
    }
  `,
})
export class DepositTable {
  readonly deposits = input.required<readonly Deposit[]>();
  /** Mapa id de cuenta → nombre; si se pasa, se muestra la columna de cuenta. */
  readonly accountNames = input<Readonly<Partial<Record<string, string>>> | null>(null);
  readonly caption = input('Depósitos');
  protected readonly status = depositStatusCopy;
  protected readonly rails = RAIL_LABELS;
  protected readonly mask = maskTail;
}
