import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { UserFacingError } from '../../../core/http/error-mapping';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { Icon } from '../../../shared/ui/icon';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { dataOf, errorOf } from '../../../shared/utilities/remote-data';
import { RfisFacade } from '../application/rfis.facade';
import {
  AnswerValue,
  answersWithValue,
  fileProblem,
  ItemAnswer,
  maxFilesFor,
  RfiDocument,
  RfiItem,
} from '../domain/rfi';
import { blockingCopy, IDENTIFIER_HINTS, rfiStatusCopy } from './rfi-copy';

type ControlValue = string | boolean | null;

@Component({
  selector: 'au-rfi-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader,
    ErrorState,
    Skeleton,
    StatusBadge,
    DateTimePipe,
    RouterLink,
    ReactiveFormsModule,
    Icon,
    ConfirmDialog,
  ],
  providers: [RfisFacade],
  templateUrl: './rfi-detail-page.html',
  styleUrl: './rfi-detail-page.css',
})
export class RfiDetailPage implements OnInit {
  readonly id = input.required<string>();

  protected readonly facade = inject(RfisFacade);
  private readonly session = inject(SessionStore);

  protected readonly identifierHints = IDENTIFIER_HINTS;
  protected readonly rfi = computed(() => dataOf(this.facade.detail()));
  protected readonly loadError = computed(() => errorOf(this.facade.detail()));
  protected readonly canManage = computed(() => this.session.can('rfis.manage'));
  protected readonly editable = computed(() => this.canManage() && (this.rfi()?.open ?? false));
  protected readonly status = computed(() => {
    const rfi = this.rfi();
    return rfi ? rfiStatusCopy(rfi) : null;
  });
  protected readonly valueItems = computed(() => (this.rfi()?.items ?? []).filter(answersWithValue));

  /** Un control por ítem que se responde con valor; se reconstruye cada vez que llega el RFI releído. */
  protected form = new FormRecord<FormControl<ControlValue>>({});
  protected readonly submitted = signal(false);
  protected readonly answerError = signal<UserFacingError | null>(null);
  protected readonly itemErrors = signal<Readonly<Record<string, string>>>({});
  protected readonly announcement = signal('');
  protected readonly removing = signal<{ item: RfiItem; document: RfiDocument } | null>(null);

  constructor() {
    effect(() => {
      const rfi = this.rfi();
      if (rfi) {
        this.form = new FormRecord<FormControl<ControlValue>>(
          Object.fromEntries(
            rfi.items
              .filter(answersWithValue)
              .map((item) => [item.id, new FormControl<ControlValue>(initialValue(item))]),
          ),
        );
        if (!this.editable()) {
          this.form.disable();
        }
      }
    });
  }

  ngOnInit(): void {
    void this.facade.loadDetail(this.id());
  }

  protected blocking(type: string): string {
    return blockingCopy(type);
  }

  protected control(item: RfiItem): FormControl<ControlValue> {
    return this.form.controls[item.id];
  }

  protected maxFiles(item: RfiItem): number {
    return maxFilesFor(item);
  }

  protected localProblem(item: RfiItem): string | null {
    const control = this.form.controls[item.id];
    if (!control || !this.submitted() || !control.dirty) {
      return null;
    }
    return valueProblem(item, control.value);
  }

  protected async refresh(): Promise<void> {
    this.answerError.set(null);
    const result = await this.facade.refresh(this.id());
    if (result && !result.ok) {
      this.answerError.set(result.error);
    }
  }

  protected async submitAnswers(): Promise<void> {
    this.submitted.set(true);
    this.answerError.set(null);
    this.itemErrors.set({});
    const answers: ItemAnswer[] = [];
    for (const item of this.valueItems()) {
      const control = this.form.controls[item.id];
      if (!control?.dirty) {
        continue;
      }
      if (valueProblem(item, control.value)) {
        return;
      }
      answers.push({ itemId: item.id, value: toAnswerValue(item, control.value) });
    }
    if (answers.length === 0) {
      this.answerError.set({
        title: 'No hay respuestas nuevas',
        description: 'Completa o cambia al menos una respuesta antes de enviar.',
        action: 'fix-fields',
        fieldErrors: {},
        providerUnavailable: false,
        source: { status: 0, code: 'client', message: null, details: null },
      });
      return;
    }
    const result = await this.facade.answer(this.id(), answers);
    if (!result) {
      return;
    }
    if (result.ok) {
      this.submitted.set(false);
      this.announcement.set(`${answers.length} ${answers.length === 1 ? 'respuesta enviada' : 'respuestas enviadas'}.`);
      return;
    }
    this.answerError.set(result.error);
    this.itemErrors.set(result.error.fieldErrors);
  }

  protected async upload(item: RfiItem, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.itemErrors.update((errors) => ({ ...errors, [item.id]: '' }));
    if (files.length === 0) {
      return;
    }
    if (files.length + item.documents.length > maxFilesFor(item)) {
      this.itemErrors.update((errors) => ({
        ...errors,
        [item.id]: `Este requerimiento admite como máximo ${maxFilesFor(item)} archivos.`,
      }));
      return;
    }
    const problems = files.map((file) => fileProblem(item, file)).filter((problem): problem is string => !!problem);
    if (problems.length) {
      this.itemErrors.update((errors) => ({ ...errors, [item.id]: problems.join(' ') }));
      return;
    }
    const result = await this.facade.upload(this.id(), item.id, files);
    if (!result) {
      return;
    }
    if (result.ok) {
      this.announcement.set(`${files.length} ${files.length === 1 ? 'archivo subido' : 'archivos subidos'}.`);
      return;
    }
    const perFile = Object.values(result.error.fieldErrors).join(' ');
    this.itemErrors.update((errors) => ({ ...errors, [item.id]: perFile || result.error.description }));
  }

  protected async openDocument(item: RfiItem, document: RfiDocument): Promise<void> {
    const result = await this.facade.documentLink(this.id(), item.id, document.id);
    if (!result) {
      return;
    }
    if (result.ok) {
      // Credencial temporal: se abre al momento y no se conserva.
      window.open(result.value.url, '_blank', 'noopener,noreferrer');
      return;
    }
    this.itemErrors.update((errors) => ({ ...errors, [item.id]: result.error.description }));
  }

  protected async openOwnerVerification(item: RfiItem): Promise<void> {
    const result = await this.facade.ownerVerificationLink(this.id(), item.id);
    if (!result) {
      return;
    }
    if (result.ok) {
      window.open(result.value.url, '_blank', 'noopener,noreferrer');
      return;
    }
    this.itemErrors.update((errors) => ({ ...errors, [item.id]: result.error.description }));
  }

  protected startRemoval(item: RfiItem, document: RfiDocument): void {
    this.removing.set({ item, document });
  }

  protected cancelRemoval(): void {
    if (!this.facade.busy()?.startsWith('remove:')) {
      this.removing.set(null);
    }
  }

  protected async confirmRemoval(): Promise<void> {
    const target = this.removing();
    if (!target) {
      return;
    }
    const result = await this.facade.removeDocument(this.id(), target.item.id, target.document.id);
    if (!result) {
      return;
    }
    this.removing.set(null);
    if (!result.ok) {
      const message = result.error.fieldErrors[target.item.id] ?? result.error.description;
      this.itemErrors.update((errors) => ({ ...errors, [target.item.id]: message }));
    }
  }
}

function initialValue(item: RfiItem): ControlValue {
  if (item.answerValue === null) {
    return item.answerType === 'boolean' ? null : '';
  }
  return item.answerType === 'boolean'
    ? item.answerValue === true || item.answerValue === 'true'
    : String(item.answerValue);
}

/** Validación de cliente con el answer_spec documentado; el proveedor valida de nuevo. */
function valueProblem(item: RfiItem, value: ControlValue): string | null {
  if (item.answerType === 'boolean') {
    return value === null ? 'Elige Sí o No.' : null;
  }
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    return 'Escribe una respuesta o deja el campo sin cambios.';
  }
  if (item.answerType === 'number') {
    const number = Number(text);
    if (!Number.isFinite(number)) return 'Escribe un número.';
    if (item.spec.min !== null && number < item.spec.min) return `El mínimo es ${item.spec.min}.`;
    if (item.spec.max !== null && number > item.spec.max) return `El máximo es ${item.spec.max}.`;
  }
  if (item.answerType === 'choice' && item.spec.options.length && !item.spec.options.includes(text)) {
    return 'Elige una de las opciones.';
  }
  const limit =
    item.spec.maxLength ?? (item.answerType === 'text_long' ? 10000 : item.answerType === 'text_short' ? 255 : null);
  if (limit !== null && text.length > limit) {
    return `Máximo ${limit} caracteres.`;
  }
  return null;
}

function toAnswerValue(item: RfiItem, value: ControlValue): AnswerValue {
  if (item.answerType === 'boolean') {
    return value === true;
  }
  const text = String(value ?? '').trim();
  return item.answerType === 'number' ? Number(text) : text;
}
