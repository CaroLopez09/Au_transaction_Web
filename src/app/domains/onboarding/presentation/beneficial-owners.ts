import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { BeneficialOwner, maskDocument, OwnershipRoster, rosterWarnings } from '../domain/beneficial-owner';
import { Icon } from '../../../shared/ui/icon';
import { livenessCopy } from './onboarding-copy';

@Component({
  selector: 'au-beneficial-owners',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadge, DecimalPipe, DateTimePipe, Icon],
  template: `
    @if (roster().members.length === 0) {
      <div class="empty">
        <p class="empty-title">Aún no hay beneficiarios registrados</p>
        <p>
          El proveedor exige al menos un beneficiario final antes de sincronizar el grupo.
          @if (canManage()) {
            Registra a cada persona con participación o control de la empresa.
          } @else {
            Los registra una persona con rol de Administración o Cumplimiento.
          }
        </p>
      </div>
    } @else {
      <dl class="summary au-ledger-strip">
        <div>
          <dt>Participación registrada</dt>
          <dd class="au-num">{{ roster().totalOwnership | number: '1.0-2' }} %</dd>
        </div>
        <div>
          <dt>Beneficiario final</dt>
          <dd>{{ roster().hasBeneficialOwner ? 'Identificado' : 'Sin identificar' }}</dd>
        </div>
        <div>
          <dt>Prueba de vida del grupo</dt>
          <dd>{{ roster().livenessComplete ? 'Completa' : 'Incompleta' }}</dd>
        </div>
      </dl>
      @for (warning of warnings(); track warning) {
        <p class="warning" role="note">
          <au-icon name="alert" [size]="16" />
          @switch (warning) {
            @case ('no-beneficial-owner') {
              Ninguna persona cuenta como beneficiario final. El proveedor rechazará la sincronización hasta que alguien
              tenga participación declarada de al menos 5 %.
            }
            @case ('ownership-over-100') {
              La participación registrada supera el 100 %. Corrígela antes de sincronizar con el proveedor.
            }
          }
        </p>
      }
      <ul class="owners">
        @for (owner of roster().members; track owner.id) {
          <li>
            <div class="identity">
              <p class="name">{{ owner.fullName }}</p>
              <p class="meta">
                {{ owner.roleInCompany ?? 'Cargo no indicado' }}
                @if (owner.documentNumber) {
                  · {{ owner.documentType ?? 'Documento' }} <span class="au-num">{{ mask(owner.documentNumber) }}</span>
                }
              </p>
              <p class="flags">
                @if (owner.beneficialOwner) {
                  <span>Beneficiario final</span>
                }
                @if (owner.hasControl) {
                  <span>Control</span>
                }
                @if (owner.signer) {
                  <span>Firmante</span>
                }
                @if (owner.politicallyExposed) {
                  <span>Persona expuesta políticamente</span>
                }
              </p>
            </div>
            <p class="ownership au-num">
              {{ owner.ownershipPercentage !== null ? (owner.ownershipPercentage | number: '1.0-2') + ' %' : '—' }}
            </p>
            <div class="liveness">
              @if (!owner.beneficialOwner) {
                <span class="meta">Sin prueba de vida</span>
              } @else if (owner.liveness.status === 'PENDING' && !owner.liveness.link) {
                <au-status-badge label="Prueba de vida sin solicitar" tone="neutral" />
              } @else {
                <au-status-badge
                  [label]="liveness(owner.liveness.status).label"
                  [tone]="liveness(owner.liveness.status).tone"
                />
                @if (owner.liveness.expiresAt && owner.liveness.status === 'PENDING') {
                  <p class="meta">Vence {{ owner.liveness.expiresAt | auDateTime }}</p>
                }
              }
            </div>
            @if (canManage()) {
              <div class="edit actions">
                <button
                  type="button"
                  class="au-button au-button--quiet"
                  [attr.aria-label]="'Editar a ' + owner.fullName"
                  (click)="edit.emit(owner)"
                >
                  Editar
                </button>
                @if (!owner.knownToProvider) {
                  <button
                    type="button"
                    class="au-button au-button--quiet"
                    [attr.aria-label]="'Quitar a ' + owner.fullName"
                    (click)="remove.emit(owner)"
                  >
                    Quitar
                  </button>
                }
              </div>
            }
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--au-space-4);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--au-space-2);
      justify-content: flex-end;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--au-space-4);
      margin: 0;
    }
    dt {
      font-size: var(--au-fs-caption);
      letter-spacing: 0.02em;
    }
    dd {
      margin: 2px 0 0;
      color: var(--au-primary);
      font-weight: 500;
    }
    .empty {
      padding: var(--au-space-1) 0 var(--au-space-2);
      max-width: 60ch;
    }
    .empty-title {
      color: var(--au-primary);
      font-weight: 500;
      margin-bottom: var(--au-space-1);
    }
    .owners {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .owners li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 96px 220px auto;
      align-items: center;
      gap: var(--au-space-4);
      padding: var(--au-space-4) 0;
      border-top: 1px solid var(--au-hairline);
    }
    .name {
      color: var(--au-primary);
      font-weight: 500;
    }
    .meta {
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
    .flags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--au-space-1) var(--au-space-3);
      margin-top: var(--au-space-1);
      font-size: var(--au-fs-caption);
      color: var(--au-text-warm);
    }
    .warning {
      display: flex;
      gap: var(--au-space-2);
      padding: var(--au-space-3) var(--au-space-4);
      border-radius: var(--au-radius-sm);
      background: var(--au-attention);
      color: var(--au-text-warm);
      font-size: var(--au-fs-data);
    }
    .warning au-icon {
      margin-top: 2px;
    }
    .edit {
      justify-self: end;
    }
    .ownership {
      text-align: right;
      color: var(--au-primary);
    }
    @media (max-width: 767px) {
      .summary {
        grid-template-columns: 1fr;
        gap: var(--au-space-3);
      }
      .owners li {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .liveness {
        grid-column: 1;
      }
      .edit {
        grid-column: 2;
        grid-row: 2;
      }
    }
  `,
})
export class BeneficialOwners {
  readonly roster = input.required<OwnershipRoster>();
  readonly canManage = input(false);
  readonly edit = output<BeneficialOwner>();
  readonly remove = output<BeneficialOwner>();
  protected readonly warnings = computed(() => rosterWarnings(this.roster()));
  protected readonly mask = maskDocument;
  protected readonly liveness = livenessCopy;
}
