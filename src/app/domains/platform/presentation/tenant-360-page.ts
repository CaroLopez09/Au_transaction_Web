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
import { PlatformRepository, Tenant360, TenantSettingsView } from '../domain/platform';
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

          <section aria-labelledby="s-settings" class="block">
            <h2 id="s-settings">Parametrización</h2>
            <p class="meta">Rieles y tokens que esta empresa puede usar. Al registrar un destinatario o
              cotizar con algo no habilitado aquí, el BFF lo rechaza.</p>
            @switch (settings().status) {
              @case ('loading') {
                <au-skeleton height="80px" />
              }
              @case ('error') {
                @if (settings(); as s) {
                  @if (s.status === 'error') {
                    <au-error-state [error]="s.error" (retry)="loadSettings()" />
                  }
                }
              }
              @case ('success') {
                @if (settingsData(); as st) {
                  <fieldset class="settings-group">
                    <legend>Rieles habilitados</legend>
                    @for (rail of st.availableRails; track rail) {
                      <label class="checkbox">
                        <input
                          type="checkbox"
                          [checked]="draftRails().includes(rail)"
                          (change)="toggleRail(rail)"
                        />
                        {{ rail }}
                      </label>
                    }
                  </fieldset>
                  <fieldset class="settings-group">
                    <legend>Tokens habilitados</legend>
                    @for (token of st.availableTokens; track token) {
                      <label class="checkbox">
                        <input
                          type="checkbox"
                          [checked]="draftTokens().includes(token)"
                          (change)="toggleToken(token)"
                        />
                        {{ token }}
                      </label>
                    }
                  </fieldset>
                  <fieldset class="settings-group">
                    <legend>Módulos habilitados (feature flags)</legend>
                    @for (feature of st.availableFeatures; track feature) {
                      <label class="checkbox">
                        <input
                          type="checkbox"
                          [checked]="draftFeatures().includes(feature)"
                          (change)="toggleFeature(feature)"
                        />
                        {{ feature }}
                      </label>
                    }
                  </fieldset>
                  @if (settingsSaveError(); as failure) {
                    <au-error-state [error]="failure" />
                  }
                  <button
                    type="button"
                    class="au-button au-button--primary"
                    [disabled]="savingSettings()"
                    [attr.aria-busy]="savingSettings()"
                    (click)="saveSettings()"
                  >
                    {{ savingSettings() ? 'Guardando…' : 'Guardar parametrización' }}
                  </button>
                }
              }
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
    .settings-group {
      display: flex;
      flex-wrap: wrap;
      gap: var(--au-space-3);
      margin: 0 0 var(--au-space-3);
      padding: var(--au-space-2) 0;
      border: 0;
    }
    .settings-group legend {
      width: 100%;
      font-weight: 600;
      margin-bottom: var(--au-space-2);
    }
    .checkbox {
      display: inline-flex;
      align-items: center;
      gap: var(--au-space-1);
    }
  `,
})
export class Tenant360Page implements OnInit {
  readonly id = input.required<string>();
  private readonly repository = inject(PlatformRepository);

  protected readonly data = signal<RemoteData<Tenant360>>(loading());
  protected readonly refreshing = signal(false);
  protected readonly refreshError = signal<UserFacingError | null>(null);

  protected readonly settings = signal<RemoteData<TenantSettingsView>>(loading());
  protected readonly draftRails = signal<readonly string[]>([]);
  protected readonly draftTokens = signal<readonly string[]>([]);
  protected readonly draftFeatures = signal<readonly string[]>([]);
  protected readonly savingSettings = signal(false);
  protected readonly settingsSaveError = signal<UserFacingError | null>(null);

  protected ficha(): Tenant360 | null {
    return dataOf(this.data());
  }

  protected settingsData(): TenantSettingsView | null {
    return dataOf(this.settings());
  }

  ngOnInit(): void {
    void this.load();
    void this.loadSettings();
  }

  protected async load(): Promise<void> {
    this.data.set(loading());
    this.data.set(await fetchRemote(this.repository.tenant(this.id())));
  }

  protected async loadSettings(): Promise<void> {
    this.settings.set(loading());
    const result = await fetchRemote(this.repository.settings(this.id()));
    this.settings.set(result);
    const current = dataOf(result);
    if (current) {
      this.draftRails.set(current.enabledRails);
      this.draftTokens.set(current.enabledTokens);
      this.draftFeatures.set(current.enabledFeatures);
    }
  }

  protected toggleRail(rail: string): void {
    this.draftRails.update((rails) =>
      rails.includes(rail) ? rails.filter((r) => r !== rail) : [...rails, rail],
    );
  }

  protected toggleToken(token: string): void {
    this.draftTokens.update((tokens) =>
      tokens.includes(token) ? tokens.filter((t) => t !== token) : [...tokens, token],
    );
  }

  protected toggleFeature(feature: string): void {
    this.draftFeatures.update((features) =>
      features.includes(feature) ? features.filter((f) => f !== feature) : [...features, feature],
    );
  }

  protected async saveSettings(): Promise<void> {
    if (this.savingSettings()) {
      return;
    }
    this.savingSettings.set(true);
    this.settingsSaveError.set(null);
    const result = await runAction(
      this.repository.updateSettings(this.id(), this.draftRails(), this.draftTokens(), this.draftFeatures()),
    );
    this.savingSettings.set(false);
    if (result.ok) {
      this.settings.set({ status: 'success', data: result.value });
      this.draftRails.set(result.value.enabledRails);
      this.draftTokens.set(result.value.enabledTokens);
      this.draftFeatures.set(result.value.enabledFeatures);
    } else {
      this.settingsSaveError.set(result.error);
    }
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
