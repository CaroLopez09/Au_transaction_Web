import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { SessionStore } from '../../../../core/auth/session.store';
import { UserFacingError } from '../../../../core/http/error-mapping';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog';
import { Drawer } from '../../../../shared/ui/drawer';
import { ErrorState } from '../../../../shared/ui/error-state';
import { Skeleton } from '../../../../shared/ui/skeleton';
import { dataOf, errorOf } from '../../../../shared/utilities/remote-data';
import { OnboardingWizardFacade } from '../../application/onboarding-wizard.facade';
import { OnboardingFacade } from '../../application/onboarding.facade';
import { BeneficialOwner } from '../../domain/beneficial-owner';
import { ownersGaps } from '../../domain/onboarding-draft';
import { AttachDocuments } from '../../domain/onboarding.repository';
import { BeneficialOwners } from '../beneficial-owners';
import { OwnerForm } from '../owner-form';
import { DocumentUploadDrawer, UploadTarget } from './document-upload-drawer';
import { StepGaps } from './step-gaps';

@Component({
  selector: 'au-owners-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BeneficialOwners, OwnerForm, Drawer, ErrorState, Skeleton, StepGaps, DocumentUploadDrawer, ConfirmDialog],
  template: `
    <div class="head">
      <p class="intro">
        Cada persona con participación o control de la empresa. Se guardan en el portal al instante; se envían al
        proveedor cuando el expediente ya existe.
      </p>
      @if (canManage()) {
        <button type="button" class="au-button au-button--secondary" (click)="editor.set({ owner: null })">
          Registrar beneficiario
        </button>
      }
    </div>

    <p class="au-visually-hidden" aria-live="polite">{{ announcement() }}</p>
    @if (actionError(); as failure) {
      <au-error-state class="error" [error]="failure" />
    }

    @switch (onboarding.roster().status) {
      @case ('loading') {
        <au-skeleton height="96px" />
      }
      @case ('error') {
        @if (rosterError(); as failure) {
          <au-error-state [error]="failure" (retry)="onboarding.reloadRoster()" />
        }
      }
      @case ('success') {
        @if (roster(); as data) {
          <au-beneficial-owners
            [roster]="data"
            [canManage]="canManage()"
            (edit)="editor.set({ owner: $event })"
            (remove)="confirmDelete.set($event)"
          />
          @if (canManage() && data.members.length) {
            <h3 class="documents-title" id="owner-documents-title">Documentos de identidad</h3>
            <ul class="documents" aria-labelledby="owner-documents-title">
              @for (owner of data.members; track owner.id) {
                <li>
                  <span>{{ owner.fullName }}</span>
                  @if (!owner.email) {
                    <span class="hint">Añade su correo para poder subir documentos.</span>
                  } @else if (!registered()) {
                    <span class="hint">Documentos disponibles tras enviar el expediente.</span>
                  } @else {
                    <button
                      type="button"
                      class="au-button au-button--quiet"
                      [disabled]="wizard.busy() !== null"
                      (click)="upload.set({ kind: 'owner', ownerId: owner.id, ownerName: owner.fullName })"
                    >
                      {{
                        wizard.busy() === 'owner-documents:' + owner.id ? 'Enviando…' : 'Subir documento de identidad'
                      }}
                    </button>
                  }
                </li>
              }
            </ul>
          }
        }
      }
    }

    @if (canManage() && registered()) {
      <div class="provider-actions">
        <button
          type="button"
          class="au-button au-button--secondary"
          [disabled]="wizard.busy() !== null || gaps().length > 0"
          [attr.aria-busy]="wizard.busy() === 'sync-owners'"
          (click)="confirmSync.set(true)"
        >
          {{ wizard.busy() === 'sync-owners' ? 'Enviando beneficiarios…' : 'Enviar beneficiarios al proveedor' }}
        </button>
      </div>
    }

    <au-step-gaps [gaps]="gaps()" [pending]="pending()" />

    @if (editor(); as current) {
      <au-drawer
        [open]="true"
        [heading]="current.owner ? 'Editar beneficiario' : 'Registrar beneficiario'"
        [busy]="onboarding.savingOwner()"
        (closeRequested)="closeEditor()"
      >
        <au-owner-form
          formId="wizard-owner-form"
          [owner]="current.owner"
          (saved)="onSaved($event, current.owner !== null)"
        />
        <div drawerFooter class="drawer-actions">
          <button
            type="button"
            class="au-button au-button--secondary"
            [disabled]="onboarding.savingOwner()"
            (click)="closeEditor()"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="wizard-owner-form"
            class="au-button au-button--primary"
            [disabled]="onboarding.savingOwner()"
            [attr.aria-busy]="onboarding.savingOwner()"
          >
            {{ onboarding.savingOwner() ? 'Guardando…' : current.owner ? 'Guardar cambios' : 'Registrar' }}
          </button>
        </div>
      </au-drawer>
    }

    @if (upload(); as target) {
      <au-document-upload-drawer
        [target]="target"
        [defaultCountry]="defaultCountry()"
        [busy]="wizard.busy() !== null"
        [error]="uploadError()"
        (send)="sendDocuments(target, $event)"
        (closed)="closeUpload()"
      />
    }

    @if (confirmSync()) {
      <au-confirm-dialog
        [open]="true"
        heading="Enviar beneficiarios al proveedor"
        confirmLabel="Enviar"
        busyLabel="Enviando…"
        tone="primary"
        [busy]="wizard.busy() === 'sync-owners'"
        (confirmed)="sync()"
        (cancelled)="confirmSync.set(false)"
      >
        <p>
          Se envía el grupo completo de beneficiarios. El proveedor identifica a cada persona por su correo: quien ya
          esté registrado se actualiza, no se duplica.
        </p>
      </au-confirm-dialog>
    }

    @if (confirmDelete(); as owner) {
      <au-confirm-dialog
        [open]="true"
        heading="Quitar beneficiario"
        confirmLabel="Quitar"
        busyLabel="Quitando…"
        [busy]="deleting()"
        (confirmed)="remove(owner)"
        (cancelled)="confirmDelete.set(null)"
      >
        <p>{{ owner.fullName }} dejará de figurar en la lista. Aún no se había enviado al proveedor.</p>
      </au-confirm-dialog>
    }
  `,
  styles: `
    .head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--au-space-3);
      margin-bottom: var(--au-space-5);
    }
    .intro {
      max-width: 60ch;
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
    .error {
      margin-bottom: var(--au-space-4);
    }
    .documents-title {
      margin: var(--au-space-6) 0 0;
      padding-top: var(--au-space-5);
      border-top: 1px solid var(--au-hairline);
      font-size: var(--au-fs-body);
      font-weight: 500;
    }
    .documents {
      list-style: none;
      margin: var(--au-space-2) 0 0;
      padding: 0;
    }
    .documents li {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: var(--au-space-2) var(--au-space-4);
      min-height: 44px;
    }
    .hint {
      color: var(--au-text-muted);
      font-size: var(--au-fs-data);
    }
    .provider-actions {
      margin: var(--au-space-6) 0;
    }
    au-step-gaps {
      display: block;
      margin-top: var(--au-space-6);
    }
    .drawer-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--au-space-2);
    }
  `,
})
export class OwnersStep {
  readonly pending = input<readonly string[]>([]);
  readonly registered = input(false);
  readonly defaultCountry = input('');

  protected readonly onboarding = inject(OnboardingFacade);
  protected readonly wizard = inject(OnboardingWizardFacade);
  private readonly session = inject(SessionStore);

  protected readonly canManage = computed(() => this.session.can('onboarding.manage'));
  protected readonly roster = computed(() => dataOf(this.onboarding.roster()));
  protected readonly rosterError = computed(() => errorOf(this.onboarding.roster()));
  protected readonly gaps = computed(() => ownersGaps(this.roster()));

  protected readonly editor = signal<{ owner: BeneficialOwner | null } | null>(null);
  protected readonly upload = signal<UploadTarget | null>(null);
  protected readonly uploadError = signal<UserFacingError | null>(null);
  protected readonly actionError = signal<UserFacingError | null>(null);
  protected readonly confirmSync = signal(false);
  protected readonly confirmDelete = signal<BeneficialOwner | null>(null);
  protected readonly deleting = signal(false);
  protected readonly announcement = signal('');

  protected closeEditor(): void {
    if (!this.onboarding.savingOwner()) {
      this.editor.set(null);
    }
  }

  protected onSaved(owner: BeneficialOwner, wasUpdate: boolean): void {
    this.editor.set(null);
    this.announcement.set(`${owner.fullName}: ${wasUpdate ? 'cambios guardados' : 'beneficiario registrado'}.`);
  }

  protected closeUpload(): void {
    if (this.wizard.busy() === null) {
      this.upload.set(null);
      this.uploadError.set(null);
    }
  }

  protected async sendDocuments(target: UploadTarget, command: AttachDocuments): Promise<void> {
    if (target.kind !== 'owner') {
      return;
    }
    this.uploadError.set(null);
    const result = await this.wizard.attachOwnerDocuments(target.ownerId, command);
    if (!result) {
      return;
    }
    if (result.ok) {
      this.upload.set(null);
      this.announcement.set(`Documento de ${target.ownerName} enviado al proveedor.`);
      return;
    }
    this.uploadError.set(result.error);
  }

  protected async remove(owner: BeneficialOwner): Promise<void> {
    if (this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.actionError.set(null);
    const error = await this.onboarding.deleteOwner(owner.id);
    this.deleting.set(false);
    this.confirmDelete.set(null);
    if (error) {
      this.actionError.set(error);
    } else {
      this.announcement.set(`${owner.fullName} quitado de la lista.`);
    }
  }

  protected async sync(): Promise<void> {
    this.actionError.set(null);
    const result = await this.wizard.syncOwners();
    if (!result) {
      return;
    }
    this.confirmSync.set(false);
    if (result.ok) {
      this.announcement.set('Beneficiarios enviados al proveedor.');
    } else {
      this.actionError.set(result.error);
    }
  }
}
