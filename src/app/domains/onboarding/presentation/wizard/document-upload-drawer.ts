import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserFacingError } from '../../../../core/http/error-mapping';
import { CountryInput } from '../../../../shared/reference/country-input';
import { Drawer } from '../../../../shared/ui/drawer';
import { ErrorState } from '../../../../shared/ui/error-state';
import { CompanyRecord, kybFilesProblem, PERSON_ID_TYPES, requiresBackSide } from '../../domain/kyb-catalog';
import { ISO_ALPHA3 } from '../../domain/onboarding-draft';
import { AttachDocuments, DocumentFile } from '../../domain/onboarding.repository';

export type UploadTarget =
  | { readonly kind: 'company'; readonly record: CompanyRecord }
  | { readonly kind: 'owner'; readonly ownerId: string; readonly ownerName: string };

interface Slot {
  readonly role: string;
  readonly label: string;
  readonly required: boolean;
  readonly multiple: boolean;
}

/**
 * Subida de un registro de identificación (empresa o persona) con sus archivos.
 * Valida con los límites del BFF antes de enviar; el archivo va al proveedor y no se guarda en el portal.
 */
@Component({
  selector: 'au-document-upload-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Drawer, ReactiveFormsModule, CountryInput, ErrorState],
  template: `
    <au-drawer [open]="true" [heading]="heading()" [busy]="busy()" (closeRequested)="closed.emit()">
      <form id="kyb-upload-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <p class="au-notice intro">
          Los archivos se envían directamente al proveedor bancario y no quedan guardados en el portal. JPEG, PNG o PDF;
          hasta 10 archivos y 7 MB en total por envío.
        </p>
        @if (error(); as failure) {
          <au-error-state class="error" [error]="failure" />
        }

        @switch (target().kind) {
          @case ('company') {
            @if (companyRecord()?.typeOptions; as options) {
              <div class="au-field">
                <label class="au-label" for="kyb-information-type">Tipo de identificador</label>
                <select id="kyb-information-type" class="au-input" formControlName="informationType">
                  @for (option of options; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </div>
            } @else {
              <p class="help-record">{{ companyRecord()?.help }}</p>
            }
          }
          @case ('owner') {
            <div class="au-field">
              <label class="au-label" for="kyb-information-type">Documento de identidad</label>
              <select id="kyb-information-type" class="au-input" formControlName="informationType">
                @for (option of personIdTypes; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>
          }
        }

        <div class="pair">
          <div class="au-field">
            <label class="au-label" for="kyb-issuing-country">País emisor</label>
            <au-country-input
              [control]="form.controls.issuingCountry"
              inputId="kyb-issuing-country"
              [invalid]="submitted() && form.controls.issuingCountry.invalid"
            />
            @if (submitted() && form.controls.issuingCountry.invalid) {
              <p class="au-field-error">Indica el país emisor (código ISO de tres letras).</p>
            }
          </div>
          @if (showNumber()) {
            <div class="au-field">
              <label class="au-label" for="kyb-number">Número <span class="au-optional">(opcional)</span></label>
              <input id="kyb-number" class="au-input" formControlName="number" autocomplete="off" />
            </div>
          }
        </div>
        @if (target().kind === 'owner') {
          <div class="au-field">
            <label class="au-label" for="kyb-expiration">Vencimiento <span class="au-optional">(opcional)</span></label>
            <input id="kyb-expiration" class="au-input short" type="date" formControlName="expiration" />
          </div>
        }

        @for (slot of slots(); track slot.role) {
          <div class="au-field slot">
            <p class="au-label">
              {{ slot.label }}
              @if (!slot.required) {
                <span class="au-optional">(opcional)</span>
              }
            </p>
            @if (filesFor(slot.role).length) {
              <ul class="files">
                @for (file of filesFor(slot.role); track file.name) {
                  <li>
                    <span>{{ file.name }} · {{ sizeLabel(file.size) }}</span>
                    <button
                      type="button"
                      class="au-button au-button--quiet"
                      [attr.aria-label]="'Quitar ' + file.name"
                      (click)="remove(slot.role, file)"
                    >
                      Quitar
                    </button>
                  </li>
                }
              </ul>
            }
            @if (slot.multiple || filesFor(slot.role).length === 0) {
              <label class="au-button au-button--secondary upload">
                {{ filesFor(slot.role).length ? 'Añadir otro archivo' : 'Elegir archivo' }}
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  [multiple]="slot.multiple"
                  (change)="add(slot.role, $event)"
                />
              </label>
            }
          </div>
        }
        @if (filesError(); as message) {
          <p class="au-field-error" role="alert">{{ message }}</p>
        }
      </form>
      <div drawerFooter class="drawer-actions">
        <button type="button" class="au-button au-button--secondary" [disabled]="busy()" (click)="closed.emit()">
          Cancelar
        </button>
        <button
          type="submit"
          form="kyb-upload-form"
          class="au-button au-button--primary"
          [disabled]="busy()"
          [attr.aria-busy]="busy()"
        >
          {{ busy() ? 'Enviando…' : 'Enviar al proveedor' }}
        </button>
      </div>
    </au-drawer>
  `,
  styles: `
    .intro,
    .error {
      margin-bottom: var(--au-space-5);
    }
    .help-record {
      margin-bottom: var(--au-space-4);
      color: var(--au-text-body);
    }
    .pair {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 var(--au-space-4);
    }
    .short {
      max-width: 220px;
    }
    .slot {
      padding-top: var(--au-space-4);
      border-top: 1px solid var(--au-hairline);
    }
    .files {
      list-style: none;
      margin: 0 0 var(--au-space-2);
      padding: 0;
    }
    .files li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--au-space-3);
      font-size: var(--au-fs-data);
    }
    .upload {
      position: relative;
      overflow: hidden;
    }
    .upload input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .upload:has(input:focus-visible) {
      outline: 2px solid var(--au-primary);
      outline-offset: 2px;
    }
    .drawer-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--au-space-2);
    }
    @media (max-width: 479px) {
      .pair {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DocumentUploadDrawer implements OnInit {
  readonly target = input.required<UploadTarget>();
  readonly defaultCountry = input('');
  readonly busy = input(false);
  readonly error = input<UserFacingError | null>(null);
  readonly send = output<AttachDocuments>();
  readonly closed = output<void>();

  protected readonly personIdTypes = PERSON_ID_TYPES;
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    informationType: ['', Validators.required],
    issuingCountry: ['', [Validators.required, Validators.pattern(ISO_ALPHA3)]],
    number: [''],
    expiration: [''],
  });
  private readonly informationType = toSignal(this.form.controls.informationType.valueChanges, { initialValue: '' });
  protected readonly submitted = signal(false);
  protected readonly files = signal<readonly DocumentFile[]>([]);
  protected readonly filesError = signal<string | null>(null);

  protected readonly companyRecord = computed(() => {
    const target = this.target();
    return target.kind === 'company' ? target.record : null;
  });
  protected readonly heading = computed(() => {
    const target = this.target();
    return target.kind === 'company' ? target.record.label : `Documento de identidad · ${target.ownerName}`;
  });
  protected readonly showNumber = computed(
    () => this.target().kind === 'owner' || (this.companyRecord()?.hasNumber ?? false),
  );
  protected readonly slots = computed<readonly Slot[]>(() => {
    const target = this.target();
    if (target.kind === 'company') {
      return [{ role: target.record.fileRole, label: 'Archivo', required: true, multiple: true }];
    }
    return [
      { role: 'front', label: 'Anverso del documento', required: true, multiple: false },
      {
        role: 'back',
        label: 'Reverso del documento',
        required: requiresBackSide(this.informationType()),
        multiple: false,
      },
      { role: 'selfie', label: 'Selfie de la persona con el documento', required: false, multiple: false },
    ];
  });

  ngOnInit(): void {
    const target = this.target();
    this.form.patchValue({
      informationType:
        target.kind === 'company'
          ? (target.record.typeOptions?.[0]?.value ?? target.record.informationType)
          : 'passport',
      issuingCountry: this.defaultCountry(),
    });
  }

  protected filesFor(role: string): File[] {
    return this.files()
      .filter((document) => document.role === role)
      .map((document) => document.file);
  }

  protected add(role: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    input.value = '';
    this.filesError.set(null);
    this.files.update((list) => [...list, ...picked.map((file) => ({ role, file }))]);
  }

  protected remove(role: string, file: File): void {
    this.files.update((list) => list.filter((document) => !(document.role === role && document.file === file)));
  }

  protected sizeLabel(bytes: number): string {
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  protected submit(): void {
    this.submitted.set(true);
    const missing = this.slots().find((slot) => slot.required && this.filesFor(slot.role).length === 0);
    const problem = missing
      ? `Falta: ${missing.label.toLowerCase()}.`
      : kybFilesProblem(this.files().map((document) => document.file));
    this.filesError.set(problem);
    if (this.form.invalid || problem) {
      return;
    }
    const value = this.form.getRawValue();
    // Solo se envía el reverso si aplica al tipo de documento elegido.
    const slotsInUse = new Set(this.slots().map((slot) => slot.role));
    this.send.emit({
      informationType: value.informationType,
      issuingCountry: value.issuingCountry,
      number: this.showNumber() ? value.number || null : null,
      expiration: this.target().kind === 'owner' ? value.expiration || null : null,
      files: this.files().filter((document) => slotsInUse.has(document.role)),
    });
  }
}
