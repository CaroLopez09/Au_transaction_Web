import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { UserFacingError } from '../../../core/http/error-mapping';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { Drawer } from '../../../shared/ui/drawer';
import { ErrorState } from '../../../shared/ui/error-state';
import { Icon } from '../../../shared/ui/icon';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { dataOf, errorOf } from '../../../shared/utilities/remote-data';
import { tickingClock } from '../../../shared/utilities/ticking-clock';
import { AccountsFacade } from '../../accounts/application/accounts.facade';
import { accountLabel } from '../../accounts/presentation/account-label';
import { RecipientsFacade } from '../../recipients/application/recipients.facade';
import { PayoutsFacade } from '../application/payouts.facade';
import {
  approvalBlocker,
  approvalsGiven,
  MAX_SUPPORTING_DOCUMENT_CHARS,
  MAX_SUPPORTING_DOCUMENTS,
  NATURES_OF_PAYMENT,
  NatureOfPayment,
  SupportingDocument,
} from '../domain/payout';
import { secondsLeft } from '../domain/quotation';
import { approvalCopy, NATURE_LABELS, statusCopy } from './payout-copy';

@Component({
  selector: 'au-payout-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader,
    ErrorState,
    Skeleton,
    StatusBadge,
    MoneyPipe,
    DateTimePipe,
    RouterLink,
    Drawer,
    ConfirmDialog,
    ReactiveFormsModule,
    Icon,
  ],
  providers: [PayoutsFacade, AccountsFacade, RecipientsFacade],
  templateUrl: './payout-detail-page.html',
  styleUrl: './payout-detail-page.css',
})
export class PayoutDetailPage implements OnInit {
  readonly id = input.required<string>();

  protected readonly facade = inject(PayoutsFacade);
  private readonly accounts = inject(AccountsFacade);
  private readonly recipients = inject(RecipientsFacade);
  private readonly session = inject(SessionStore);
  private readonly now = tickingClock();

  protected readonly natures = NATURES_OF_PAYMENT;
  protected readonly natureLabels = NATURE_LABELS;
  protected readonly maxDocuments = MAX_SUPPORTING_DOCUMENTS;
  protected readonly justPrepared = signal(false);

  protected readonly payout = computed(() => dataOf(this.facade.detail()));
  protected readonly loadError = computed(() => errorOf(this.facade.detail()));
  protected readonly quotation = computed(() => {
    const state = this.facade.quotation();
    return state ? dataOf(state) : null;
  });
  protected readonly events = computed(() => {
    const state = this.facade.events();
    return state === null ? null : { data: dataOf(state), error: errorOf(state), loading: state.status === 'loading' };
  });
  protected readonly view = computed(() => {
    const payout = this.payout();
    if (!payout) {
      return null;
    }
    const quotation = this.quotation();
    const blocker = approvalBlocker(payout, this.session.operator()?.userId ?? null);
    const quoteSeconds = quotation ? secondsLeft(quotation, this.now()) : null;
    return {
      payout,
      approval: approvalCopy(payout.approvalState),
      status: statusCopy(payout.status),
      submitted: payout.approvalState === 'SUBMITTED',
      canRefresh: payout.approvalState === 'SUBMITTED' && this.session.can('provider.refresh'),
      isMine: payout.makerUserId === this.session.operator()?.userId,
      /** Nombre del BFF; el directorio solo sirve de respaldo y no trae los archivados (G-26). */
      recipient: (dataOf(this.recipients.recipients()) ?? []).find((item) => item.id === payout.recipientId) ?? null,
      account: (dataOf(this.accounts.accounts()) ?? []).find((item) => item.id === payout.virtualAccountId) ?? null,
      canDecide: this.session.can('payouts.approve') && blocker === null,
      ownPayout: blocker === 'own-payout',
      alreadySigned: blocker === 'already-signed',
      approvalsGiven: approvalsGiven(payout),
      quoteSeconds,
      /** Payout.approve rechaza con la cotización vencida: se anticipa en la UI. */
      quoteExpired: payout.priceLocked && quoteSeconds === 0,
    };
  });
  /** El BFF resuelve el nombre aunque el destinatario esté archivado (G-26); el directorio es respaldo. */
  protected readonly recipientName = computed(() => {
    const view = this.view();
    return view?.payout.recipientName ?? view?.recipient?.name ?? 'No disponible en el directorio';
  });

  /** Quién preparó el pago (G-03). Sin nombre no se puede auditar quién firmó qué. */
  protected readonly makerName = computed(() => {
    const view = this.view();
    if (!view) {
      return '';
    }
    return view.isMine ? 'ti' : (view.payout.makerName ?? 'otra persona de la organización');
  });

  /** Firma ya registrada: la definitiva si el pago salió, o la primera si aún espera la segunda. */
  protected readonly approverName = computed(() => {
    const payout = this.payout();
    if (!payout) {
      return null;
    }
    const userId = payout.approverUserId ?? payout.firstApproverUserId;
    if (!userId) {
      return null;
    }
    if (userId === this.session.operator()?.userId) {
      return 'ti';
    }
    return (payout.approverUserId ? payout.approverName : payout.firstApproverName) ?? 'otra persona de la organización';
  });

  protected readonly accountName = computed(() => {
    const account = this.view()?.account;
    return account ? accountLabel(account) : 'Cuenta no disponible';
  });

  protected readonly actionError = signal<UserFacingError | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly approving = signal(false);
  protected readonly rejecting = signal(false);
  protected readonly documents = signal<readonly SupportingDocument[]>([]);
  protected readonly documentError = signal<string | null>(null);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly approveForm = this.fb.group({
    natureOfPayment: this.fb.control<NatureOfPayment | ''>(''),
    memo: ['', Validators.maxLength(255)],
    comment: [''],
  });
  protected readonly rejectForm = this.fb.group({ reason: ['', Validators.required] });

  ngOnInit(): void {
    this.justPrepared.set((history.state as { prepared?: unknown } | null)?.prepared === true);
    void this.facade.loadDetail(this.id());
    void this.accounts.loadList();
    void this.recipients.loadList();
  }

  protected countdown(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  protected async refresh(): Promise<void> {
    this.actionError.set(null);
    const result = await this.facade.refresh(this.id());
    if (result && !result.ok) {
      this.actionError.set(result.error);
    }
  }

  protected startApproval(): void {
    this.approveForm.reset({ natureOfPayment: '', memo: '', comment: '' });
    this.documents.set([]);
    this.documentError.set(null);
    this.actionError.set(null);
    this.approving.set(true);
  }

  protected closeApproval(): void {
    if (this.facade.busy() !== 'approve') {
      this.approving.set(false);
    }
  }

  protected async addDocuments(event: Event, type: 'invoice' | 'other'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.documentError.set(null);
    for (const file of files) {
      if (this.documents().length >= MAX_SUPPORTING_DOCUMENTS) {
        this.documentError.set(`Se admiten como máximo ${MAX_SUPPORTING_DOCUMENTS} documentos de soporte.`);
        return;
      }
      const dataUri = await readAsDataUri(file);
      // SupportingDocument del BFF mide el data URI, que ya infla el archivo un tercio.
      if (dataUri.length > MAX_SUPPORTING_DOCUMENT_CHARS) {
        this.documentError.set(`${file.name} supera el límite de 3 MB (medido una vez codificado).`);
        continue;
      }
      this.documents.update((list) => [...list, { type, fileName: file.name, dataUri }]);
    }
  }

  protected removeDocument(index: number): void {
    this.documents.update((list) => list.filter((_, position) => position !== index));
  }

  protected async confirmApproval(): Promise<void> {
    if (this.approveForm.invalid) {
      this.approveForm.markAllAsTouched();
      return;
    }
    const value = this.approveForm.getRawValue();
    const result = await this.facade.approve(this.id(), {
      natureOfPayment: value.natureOfPayment || null,
      memo: value.memo || null,
      comment: value.comment || null,
      documents: this.documents(),
    });
    if (!result) {
      return;
    }
    this.approving.set(false);
    if (result.ok && result.value.approvalState === 'PENDING_APPROVAL') {
      this.notice.set('Aprobación registrada. El pago supera el límite de la empresa: falta la de otra persona.');
    }
    if (!result.ok) {
      // El BFF puede haber marcado el pago como fallido: se relee para no mostrar un estado viejo.
      this.actionError.set(result.error);
      void this.facade.loadDetail(this.id());
    }
  }

  protected async requote(): Promise<void> {
    this.actionError.set(null);
    this.notice.set(null);
    const result = await this.facade.requote(this.id());
    if (!result) {
      return;
    }
    if (result.ok) {
      this.notice.set(
        result.value.requiredApprovals > 1
          ? 'Nueva cotización aplicada. Revisa el desglose: las aprobaciones empiezan de nuevo.'
          : 'Nueva cotización aplicada. Revisa el desglose antes de aprobar.',
      );
    } else {
      this.actionError.set(result.error);
    }
  }

  protected startRejection(): void {
    this.rejectForm.reset({ reason: '' });
    this.actionError.set(null);
    this.rejecting.set(true);
  }

  protected cancelRejection(): void {
    if (this.facade.busy() !== 'reject') {
      this.rejecting.set(false);
    }
  }

  protected async confirmRejection(): Promise<void> {
    if (this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();
      return;
    }
    const result = await this.facade.reject(this.id(), this.rejectForm.getRawValue().reason);
    if (!result) {
      return;
    }
    this.rejecting.set(false);
    if (!result.ok) {
      this.actionError.set(result.error);
    }
  }
}

function readAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
