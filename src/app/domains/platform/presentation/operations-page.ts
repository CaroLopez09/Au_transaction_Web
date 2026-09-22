import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { Drawer } from '../../../shared/ui/drawer';
import { dataOf, fetchRemote, loading, RemoteData } from '../../../shared/utilities/remote-data';
import { KiraSandboxUser, PlatformRepository, ReviewItem, TenantSummary } from '../domain/platform';
import { kybStatusLabel } from './platform-copy';

type Tab = 'queue' | 'clients' | 'sandbox';

/** Consola de operaciones y cumplimiento: bandeja de lo que pide atención y listado de clientes. */
@Component({
  selector: 'au-operations-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, StatusBadge, DateTimePipe, RouterLink, Drawer, ReactiveFormsModule],
  template: `
    <au-page-header
      title="Operaciones y cumplimiento"
      description="Todas las organizaciones: lo que pide atención primero, y la ficha 360 de cada cliente. Solo lectura."
    />

    <div class="tabs" role="tablist" aria-label="Vista">
      <button type="button" role="tab" [attr.aria-selected]="tab() === 'queue'" (click)="selectTab('queue')">
        Bandeja de revisión
        @if (queueCount() > 0) {
          <span class="count">{{ queueCount() }}</span>
        }
      </button>
      <button type="button" role="tab" [attr.aria-selected]="tab() === 'clients'" (click)="selectTab('clients')">
        Clientes
      </button>
      <button type="button" role="tab" [attr.aria-selected]="tab() === 'sandbox'" (click)="selectTab('sandbox')">
        Kira Sandbox
      </button>
    </div>

    @if (tab() === 'queue') {
      @switch (queue().status) {
        @case ('loading') {
          <au-skeleton height="200px" />
        }
        @case ('error') {
          @if (queue(); as state) {
            @if (state.status === 'error') {
              <au-error-state [error]="state.error" (retry)="loadQueue()" />
            }
          }
        }
        @case ('success') {
          @if (queueItems().length === 0) {
            <p class="au-notice">Nada pendiente de revisión.</p>
          } @else {
            <ul class="queue">
              @for (item of queueItems(); track $index) {
                <li>
                  <au-status-badge
                    [label]="item.severity === 'critical' ? 'Urgente' : 'Atención'"
                    [tone]="item.severity"
                  />
                  <div>
                    <p class="title">{{ item.title }}</p>
                    <p class="meta">
                      {{ item.tenantName }}
                      @if (item.since) {
                        · desde {{ item.since | auDateTime }}
                      }
                    </p>
                    @if (item.detail) {
                      <p class="meta">{{ item.detail }}</p>
                    }
                  </div>
                  <a class="au-button au-button--quiet" [routerLink]="['/operaciones', item.tenantId]">Ver ficha</a>
                </li>
              }
            </ul>
          }
        }
      }
    } @else if (tab() === 'clients') {
      <form class="filters" role="search" aria-label="Filtrar clientes" (submit)="$event.preventDefault()">
        <div class="au-field">
          <label class="au-label" for="client-search">Buscar</label>
          <input id="client-search" class="au-input" (input)="search.set(value($event))" />
        </div>
        <div class="au-field">
          <label class="au-label" for="client-status">Estado</label>
          <select id="client-status" class="au-input" (change)="status.set(value($event))">
            <option value="">Todos</option>
            @for (option of statuses; track option) {
              <option [value]="option">{{ label(option) }}</option>
            }
          </select>
        </div>
      </form>
      @switch (clients().status) {
        @case ('loading') {
          <au-skeleton height="240px" />
        }
        @case ('error') {
          @if (clients(); as state) {
            @if (state.status === 'error') {
              <au-error-state [error]="state.error" (retry)="loadClients()" />
            }
          }
        }
        @case ('success') {
          <div class="au-table-wrap">
            <table class="au-table">
              <caption class="au-visually-hidden">Organizaciones cliente</caption>
              <thead>
                <tr>
                  <th scope="col">Organización</th>
                  <th scope="col">Vinculación</th>
                  <th scope="col">Faltantes</th>
                  <th scope="col">Cuentas</th>
                  <th scope="col">RFIs abiertas</th>
                  <th scope="col">Pagos retenidos</th>
                </tr>
              </thead>
              <tbody>
                @for (client of filteredClients(); track client.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/operaciones', client.id]">{{ client.name }}</a>
                    </td>
                    <td>
                      {{ label(client.status) }}
                      @if (client.readyForVirtualAccounts) {
                        <span class="sub">Producto habilitado</span>
                      }
                    </td>
                    <td class="au-num">{{ client.pendingFields }}</td>
                    <td class="au-num">{{ client.virtualAccounts }}</td>
                    <td class="au-num">
                      {{ client.openRfis }}
                      @if (client.overdueRfis > 0) {
                        <span class="sub critical">{{ client.overdueRfis }} vencidas</span>
                      }
                    </td>
                    <td class="au-num">{{ client.heldPayouts }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    } @else {
      @switch (sandboxUsers().status) {
        @case ('loading') {
          <au-skeleton height="240px" />
        }
        @case ('error') {
          @if (sandboxUsers(); as state) {
            @if (state.status === 'error') {
              <au-error-state [error]="state.error" (retry)="loadSandboxUsers()" />
            }
          }
        }
        @case ('success') {
          <div class="au-table-wrap">
            <table class="au-table">
              <caption class="au-visually-hidden">Clientes de Kira Sandbox</caption>
              <thead>
                <tr>
                  <th scope="col">Empresa</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">ID de Kira</th>
                  <th scope="col">ID externo</th>
                  <th scope="col"><span class="au-visually-hidden">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (client of sandboxClientList(); track client.id) {
                  <tr>
                    <td>{{ client.name ?? 'Sin razón social' }}</td>
                    <td>{{ client.email ?? 'No disponible' }}</td>
                    <td>{{ client.status ?? 'No disponible' }}</td>
                    <td class="au-num">{{ client.id }}</td>
                    <td class="au-num">{{ client.externalId ?? 'No disponible' }}</td>
                    <td>
                      @if (isImported(client)) {
                        <span class="sub">Importado</span>
                      } @else {
                        <button type="button" class="au-button au-button--quiet" (click)="startImport(client)">
                          Importar
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    }

    @if (importingClient(); as client) {
      <au-drawer
        [open]="true"
        heading="Crear acceso para cliente"
        [busy]="importingId() === client.id"
        (closeRequested)="closeImport()"
      >
        <form id="sandbox-import-form" [formGroup]="importForm" (ngSubmit)="submitImport(client)" novalidate>
          <p class="au-help">{{ client.name ?? client.id }} se importará desde Kira y esta persona será su administrador inicial.</p>
          @if (importError(); as failure) {
            <au-error-state [error]="failure" />
          }
          <div class="au-field">
            <label class="au-label" for="administrator-first-name">Nombre</label>
            <input id="administrator-first-name" class="au-input" formControlName="firstName" autocomplete="given-name" [attr.aria-invalid]="invalidImportField('firstName')" />
            @if (invalidImportField('firstName')) {
              <p class="au-field-error">Escribe el nombre.</p>
            }
          </div>
          <div class="au-field">
            <label class="au-label" for="administrator-last-name">Apellido</label>
            <input id="administrator-last-name" class="au-input" formControlName="lastName" autocomplete="family-name" [attr.aria-invalid]="invalidImportField('lastName')" />
            @if (invalidImportField('lastName')) {
              <p class="au-field-error">Escribe el apellido.</p>
            }
          </div>
          <div class="au-field">
            <label class="au-label" for="administrator-email">Correo</label>
            <input id="administrator-email" class="au-input" type="email" formControlName="email" autocomplete="email" [attr.aria-invalid]="invalidImportField('email')" />
            @if (invalidImportField('email')) {
              <p class="au-field-error">Escribe un correo válido.</p>
            }
          </div>
          <div class="au-field">
            <label class="au-label" for="administrator-password">Contraseña inicial</label>
            <input id="administrator-password" class="au-input" type="password" formControlName="password" autocomplete="new-password" [attr.aria-invalid]="invalidImportField('password')" />
            <p class="au-help">Mínimo 12 caracteres. Esta persona validará su identidad antes de operar.</p>
            @if (invalidImportField('password')) {
              <p class="au-field-error">La contraseña debe tener entre 12 y 100 caracteres.</p>
            }
          </div>
        </form>
        <div drawerFooter class="drawer-actions">
          <button type="button" class="au-button au-button--secondary" (click)="closeImport()">Cancelar</button>
          <button type="submit" form="sandbox-import-form" class="au-button au-button--primary" [disabled]="importingId() === client.id">
            {{ importingId() === client.id ? 'Importando…' : 'Importar cliente' }}
          </button>
        </div>
      </au-drawer>
    }
  `,
  styles: `
    .tabs {
      display: flex;
      gap: var(--au-space-2);
      margin-bottom: var(--au-space-4);
      border-bottom: 1px solid var(--au-border);
    }
    .tabs button {
      padding: var(--au-space-2) var(--au-space-3);
      border: 0;
      border-bottom: 2px solid transparent;
      background: transparent;
      font: inherit;
      cursor: pointer;
    }
    .tabs button[aria-selected='true'] {
      border-bottom-color: currentColor;
      font-weight: 600;
    }
    .count {
      margin-left: var(--au-space-1);
      padding: 0 0.4rem;
      border-radius: 999px;
      background: var(--au-border);
      font-size: 0.75rem;
    }
    .queue {
      display: grid;
      gap: var(--au-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .queue li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: var(--au-space-3);
      align-items: start;
      padding: var(--au-space-3) var(--au-space-4);
      border: 1px solid var(--au-border);
      border-radius: var(--au-radius-md, 10px);
      background: var(--au-surface);
    }
    .title {
      margin: 0;
      font-weight: 600;
    }
    .meta,
    .sub {
      margin: var(--au-space-1) 0 0;
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
    .sub {
      display: block;
    }
    .critical {
      color: var(--au-critical, #b3261e);
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0 var(--au-space-4);
    }
    @media (max-width: 640px) {
      .queue li {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class OperationsPage implements OnInit {
  private readonly repository = inject(PlatformRepository);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly tab = signal<Tab>('queue');
  protected readonly queue = signal<RemoteData<readonly ReviewItem[]>>(loading());
  protected readonly clients = signal<RemoteData<readonly TenantSummary[]>>(loading());
  protected readonly sandboxUsers = signal<RemoteData<readonly KiraSandboxUser[]>>(loading());
  private readonly sandboxUsersLoaded = signal(false);
  protected readonly importingId = signal<string | null>(null);
  protected readonly importingClient = signal<KiraSandboxUser | null>(null);
  protected readonly importError = signal<import('../../../core/http/error-mapping').UserFacingError | null>(null);
  protected readonly search = signal('');
  protected readonly status = signal('');
  protected readonly statuses = ['CREATED', 'VERIFYING', 'REVIEW', 'VERIFIED', 'REJECTED'];
  protected readonly importForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(100)]],
  });

  protected readonly queueItems = computed(() => dataOf(this.queue()) ?? []);
  protected readonly queueCount = computed(() => this.queueItems().length);
  protected readonly sandboxClientList = computed(() => dataOf(this.sandboxUsers()) ?? []);
  protected readonly importedKiraUserIds = computed(
    () => new Set((dataOf(this.clients()) ?? []).map((client) => client.providerUserId).filter((id): id is string => id !== null)),
  );
  protected readonly filteredClients = computed(() => {
    const term = this.search().trim().toLowerCase();
    return (dataOf(this.clients()) ?? []).filter(
      (client) =>
        (!term || client.name.toLowerCase().includes(term) || client.id.toLowerCase().includes(term)) &&
        (!this.status() || client.status === this.status()),
    );
  });

  ngOnInit(): void {
    void this.loadQueue();
    void this.loadClients();
  }

  protected async loadQueue(): Promise<void> {
    this.queue.set(loading());
    this.queue.set(await fetchRemote(this.repository.reviewQueue()));
  }

  protected async loadClients(): Promise<void> {
    this.clients.set(loading());
    this.clients.set(await fetchRemote(this.repository.tenants()));
  }

  protected selectTab(tab: Tab): void {
    this.tab.set(tab);
    if (tab === 'sandbox' && !this.sandboxUsersLoaded()) {
      void this.loadSandboxUsers();
    }
  }

  protected async loadSandboxUsers(): Promise<void> {
    this.sandboxUsers.set(loading());
    this.sandboxUsers.set(await fetchRemote(this.repository.sandboxUsers()));
    this.sandboxUsersLoaded.set(true);
  }

  protected isImported(client: KiraSandboxUser): boolean {
    return this.importedKiraUserIds().has(client.id);
  }

  protected startImport(client: KiraSandboxUser): void {
    this.importForm.reset({ firstName: '', lastName: '', email: '', password: '' });
    this.importError.set(null);
    this.importingClient.set(client);
  }

  protected closeImport(): void {
    if (this.importingId() === null) {
      this.importingClient.set(null);
    }
  }

  protected async submitImport(client: KiraSandboxUser): Promise<void> {
    if (this.importForm.invalid) {
      this.importForm.markAllAsTouched();
      return;
    }
    this.importingId.set(client.id);
    this.importError.set(null);
    try {
      const result = await fetchRemote(this.repository.importSandboxTenant({
        kiraUserId: client.id,
        name: client.name?.trim() || client.id,
        taxId: null,
        administrator: this.importForm.getRawValue(),
      }));
      if (result.status === 'error') {
        this.importError.set(result.error);
        return;
      }
      await this.loadClients();
      this.importingClient.set(null);
      this.tab.set('clients');
    } finally {
      this.importingId.set(null);
    }
  }

  protected invalidImportField(name: 'firstName' | 'lastName' | 'email' | 'password'): boolean {
    const field = this.importForm.controls[name];
    return field.invalid && field.touched;
  }

  protected label(status: string): string {
    return kybStatusLabel(status);
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
