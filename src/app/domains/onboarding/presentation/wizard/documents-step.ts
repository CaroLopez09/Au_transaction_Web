import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { UserFacingError } from '../../../../core/http/error-mapping';
import { DateTimePipe } from '../../../../shared/ui/date-time.pipe';
import { StatusBadge } from '../../../../shared/ui/status-badge';
import { toDate } from '../../../../shared/utilities/dates';
import { OnboardingWizardFacade } from '../../application/onboarding-wizard.facade';
import { COMPANY_RECORDS, CompanyRecord } from '../../domain/kyb-catalog';
import { AttachDocuments } from '../../domain/onboarding.repository';
import { DocumentUploadDrawer, UploadTarget } from './document-upload-drawer';
import { StepGaps } from './step-gaps';

@Component({
  selector: 'au-documents-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadge, DateTimePipe, DocumentUploadDrawer, StepGaps],
  template: `
    <p class="intro">
      Sube cada documento cuando lo tengas; los que falten quedan pendientes y puedes volver otro día. Los archivos van
      directamente al proveedor. Los documentos de identidad de cada persona están en «Beneficiarios».
    </p>
    @if (!registered()) {
      <p class="au-notice au-notice--attention">
        Los documentos se habilitan después de crear el expediente en «Enviar al proveedor».
      </p>
    }
    <p class="au-visually-hidden" aria-live="polite">{{ announcement() }}</p>

    <ul class="records">
      @for (record of records; track record.informationType) {
        <li>
          <div class="body">
            <p class="title">{{ record.label }}</p>
            <p class="help">{{ record.help }}</p>
            @if (uploaded(record); as done) {
              <p class="help">{{ done.fileNames.join(', ') }} · {{ uploadedAt(done.uploadedAt) | auDateTime }}</p>
            }
          </div>
          @if (uploaded(record)) {
            <au-status-badge label="Enviado" tone="success" />
          } @else if (requested(record)) {
            <au-status-badge label="Lo pide el proveedor" tone="attention" />
          } @else {
            <au-status-badge label="Pendiente" tone="neutral" />
          }
          @if (canManage() && registered()) {
            <button
              type="button"
              class="au-button au-button--quiet"
              [disabled]="wizard.busy() !== null"
              (click)="open(record)"
            >
              {{ uploaded(record) ? 'Reemplazar' : 'Subir' }}
            </button>
          }
        </li>
      }
    </ul>

    <au-step-gaps
      [gaps]="[]"
      [pending]="pending()"
      doneLabel="El proveedor no pide documentos adicionales en este momento."
    />

    @if (target(); as current) {
      <au-document-upload-drawer
        [target]="current"
        [defaultCountry]="defaultCountry()"
        [busy]="wizard.busy() !== null"
        [error]="error()"
        (send)="send($event)"
        (closed)="close()"
      />
    }
  `,
  styles: `
    .intro {
      max-width: 68ch;
      margin-bottom: var(--au-space-5);
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
    .au-notice {
      margin-bottom: var(--au-space-5);
    }
    .records {
      list-style: none;
      margin: 0 0 var(--au-space-6);
      padding: 0;
      border-top: 1px solid var(--au-hairline);
    }
    .records li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: var(--au-space-2) var(--au-space-4);
      padding: var(--au-space-4) 0;
      border-bottom: 1px solid var(--au-hairline);
    }
    .title {
      color: var(--au-primary);
      font-weight: 500;
    }
    .help {
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
    @media (max-width: 639px) {
      .records li {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .records li .au-button {
        grid-column: 1 / -1;
        justify-self: start;
      }
    }
  `,
})
export class DocumentsStep {
  readonly registered = input(false);
  readonly pending = input<readonly string[]>([]);
  readonly defaultCountry = input('');

  protected readonly wizard = inject(OnboardingWizardFacade);
  private readonly session = inject(SessionStore);
  protected readonly records = COMPANY_RECORDS;
  protected readonly canManage = computed(() => this.session.can('onboarding.manage'));
  protected readonly target = signal<UploadTarget | null>(null);
  protected readonly error = signal<UserFacingError | null>(null);
  protected readonly announcement = signal('');

  protected uploaded(record: CompanyRecord) {
    const documents = this.wizard.draft().documents;
    return record.typeOptions
      ? (record.typeOptions.map((option) => documents[option.value]).find(Boolean) ?? null)
      : (documents[record.informationType] ?? null);
  }

  /** El proveedor pide el archivo por su papel (file_*) en pendingFields. */
  protected requested(record: CompanyRecord): boolean {
    return this.pending().some((field) => field.includes(record.fileRole) || field.includes(record.informationType));
  }

  protected uploadedAt(value: string): Date | null {
    return toDate(value);
  }

  protected open(record: CompanyRecord): void {
    this.error.set(null);
    this.target.set({ kind: 'company', record });
  }

  protected close(): void {
    if (this.wizard.busy() === null) {
      this.target.set(null);
    }
  }

  protected async send(command: AttachDocuments): Promise<void> {
    this.error.set(null);
    const result = await this.wizard.attachCompanyDocuments(command);
    if (!result) {
      return;
    }
    if (result.ok) {
      this.target.set(null);
      this.announcement.set('Documento enviado al proveedor.');
    } else {
      this.error.set(result.error);
    }
  }
}
