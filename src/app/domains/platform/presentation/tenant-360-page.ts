import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { dataOf, fetchRemote, loading, RemoteData, runAction } from '../../../shared/utilities/remote-data';
import { UserFacingError } from '../../../core/http/error-mapping';
import { PlatformRepository, Tenant360 } from '../domain/platform';
import { kybStatusLabel } from './platform-copy';

/** Ficha 360 de una organización para operaciones y cumplimiento. Solo lectura. */
@Component({
  selector: 'au-tenant-360-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, StatusBadge, DateTimePipe, MoneyPipe, RouterLink],
  template: `
    <a class="back" routerLink="/operaciones">← Operaciones</a>
    @switch (data().status) {
      @case ('loading') {
        <au-skeleton height="320px" />
      }
      @case ('error') {
        @if (data(); as state) {
          @if (state.status === 'error') {
            <au-error-state [error]="state.error" (retry)="load()" />
          }
        }
      }
      @case ('success') {
        @if (ficha(); as f) {
          <au-page-header [title]="f.summary.name" [description]="'Organización ' + f.summary.id">
            <button
              type="button"
              class="au-button au-button--secondary"
              [disabled]="refreshing()"
              [attr.aria-busy]="refreshing()"
              (click)="refresh()"
            >
              {{ refreshing() ? 'Consultando…' : 'Actualizar desde el proveedor' }}
            </button>
          </au-page-header>
          @if (refreshError(); as failure) {
            <au-error-state [error]="failure" />
          }

          <section aria-labelledby="s-kyb" class="block">
            <h2 id="s-kyb">Vinculación</h2>
            <p>
              <au-status-badge [label]="label(f.onboarding.status)" [tone]="tone(f.onboarding.status)" />
              @if (f.onboarding.readyForVirtualAccounts) {
                <span class="meta">Producto de cuentas en EE. UU. habilitado</span>
              }
            </p>
            @if (f.onboarding.rejectionReason) {
              <p><strong>Motivo del rechazo:</strong> {{ f.onboarding.rejectionReason }}</p>
            }
            @if (f.onboarding.enhancedDueDiligenceRequired) {
              <p class="au-notice">La industria exige debida diligencia reforzada, que el proveedor no ofrece.</p>
            }
            @if (f.onboarding.pendingFields.length) {
              <p class="meta">Lo que pide el proveedor ({{ f.onboarding.pendingFields.length }}):</p>
              <ul class="tokens">
                @for (field of f.onboarding.pendingFields; track field) {
                  <li class="au-mono">{{ field }}</li>
                }
              </ul>
            }
          </section>

          <section aria-labelledby="s-ubos" class="block">
            <h2 id="s-ubos">Beneficiarios finales ({{ f.beneficialOwners.length }})</h2>
            @if (f.beneficialOwners.length === 0) {
              <p class="meta">Sin beneficiarios registrados.</p>
            } @else {
              <div class="au-table-wrap">
                <table class="au-table">
                  <thead>
                    <tr>
                      <th scope="col">Persona</th>
                      <th scope="col">Participación</th>
                      <th scope="col">Prueba de vida</th>
                      <th scope="col">En el proveedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (owner of f.beneficialOwners; track owner.id) {
                      <tr>
                        <td>{{ owner.fullName }}</td>
                        <td class="au-num">{{ owner.ownershipPercentage ?? '—' }} %</td>
                        <td>{{ owner.livenessStatus ?? '—' }}</td>
                        <td>{{ owner.knownToKira ? 'Sí' : 'No' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section aria-labelledby="s-accounts" class="block">
            <h2 id="s-accounts">Cuentas virtuales ({{ f.accounts.length }})</h2>
            @for (account of f.accounts; track account.id) {
              <p>
                <span class="au-mono">{{ account.id }}</span> · {{ account.status }} ·
                {{ account.fundsReady ? 'Operativa' : account.activationDelayed ? 'Activación demorada' : 'Sin habilitar' }}
                @if (account.availableBalance !== null) {
                  · saldo {{ account.availableBalance | auMoney: account.currency }}
                }
              </p>
            } @empty {
              <p class="meta">Sin cuentas.</p>
            }
          </section>

          <section aria-labelledby="s-payouts" class="block">
            <h2 id="s-payouts">Pagos recientes</h2>
            @for (payout of f.payouts; track payout.id) {
              <p>
                {{ payout.createdAt | auDateTime }} · {{ payout.amount | auMoney: payout.currency }} ·
                {{ payout.approvalState }} / {{ payout.status }}
              </p>
            } @empty {
              <p class="meta">Sin pagos.</p>
            }
          </section>

          <section aria-labelledby="s-deposits" class="block">
            <h2 id="s-deposits">Depósitos recientes</h2>
            @for (deposit of f.deposits; track deposit.id) {
              <p>
                {{ deposit.createdAt | auDateTime }} · {{ deposit.netAmount | auMoney: deposit.currency }} ·
                {{ deposit.status }}
                @if (deposit.held) {
                  <strong>· retenido</strong>
                }
              </p>
            } @empty {
              <p class="meta">Sin depósitos.</p>
            }
          </section>

          <section aria-labelledby="s-rfis" class="block">
            <h2 id="s-rfis">Solicitudes de información</h2>
            @for (rfi of f.rfis; track rfi.id) {
              <p>
                {{ rfi.status }}
                @if (rfi.resolutionReason) {
                  ({{ rfi.resolutionReason }})
                }
                @if (rfi.dueDate) {
                  · vence {{ rfi.dueDate | auDateTime }}
                }
                @if (rfi.overdue) {
                  <strong>· vencida</strong>
                }
              </p>
            } @empty {
              <p class="meta">Sin solicitudes.</p>
            }
          </section>
        }
      }
    }
  `,
  styles: `
    .back {
      display: inline-block;
      margin-bottom: var(--au-space-3);
    }
    .block {
      margin-bottom: var(--au-space-5);
      padding: var(--au-space-4);
      border: 1px solid var(--au-border);
      border-radius: var(--au-radius-md, 10px);
      background: var(--au-surface);
    }
    .meta {
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
    .tokens {
      display: flex;
      flex-wrap: wrap;
      gap: var(--au-space-2);
      padding: 0;
      list-style: none;
    }
    .tokens li {
      padding: 0 var(--au-space-2);
      border: 1px solid var(--au-border);
      border-radius: var(--au-radius-sm, 6px);
      font-size: var(--au-fs-data);
    }
  `,
})
export class Tenant360Page implements OnInit {
  readonly id = input.required<string>();
  private readonly repository = inject(PlatformRepository);

  protected readonly data = signal<RemoteData<Tenant360>>(loading());
  protected readonly refreshing = signal(false);
  protected readonly refreshError = signal<UserFacingError | null>(null);

  protected ficha(): Tenant360 | null {
    return dataOf(this.data());
  }

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.data.set(loading());
    this.data.set(await fetchRemote(this.repository.tenant(this.id())));
  }

  protected async refresh(): Promise<void> {
    if (this.refreshing()) {
      return;
    }
    this.refreshing.set(true);
    this.refreshError.set(null);
    const result = await runAction(this.repository.refresh(this.id()));
    this.refreshing.set(false);
    if (result.ok) {
      this.data.set({ status: 'success', data: result.value });
    } else {
      this.refreshError.set(result.error);
    }
  }

  protected label(status: string): string {
    return kybStatusLabel(status);
  }

  protected tone(status: string): 'success' | 'critical' | 'attention' | 'progress' {
    return status === 'VERIFIED' ? 'success' : status === 'REJECTED' ? 'critical' : status === 'REVIEW' ? 'attention' : 'progress';
  }
}
