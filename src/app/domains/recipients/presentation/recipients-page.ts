import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { UserFacingError } from '../../../core/http/error-mapping';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { DateTimePipe } from '../../../shared/ui/date-time.pipe';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { dataOf, errorOf } from '../../../shared/utilities/remote-data';
import { OnboardingFacade } from '../../onboarding/application/onboarding.facade';
import { RecipientsFacade } from '../application/recipients.facade';
import { Recipient } from '../domain/recipient';

export const RAIL_NAMES: Record<string, string> = { ACH: 'ACH', WIRE: 'Wire', WALLET: 'Wallet' };

@Component({
  selector: 'au-recipients-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, StatusBadge, RouterLink, ConfirmDialog, DateTimePipe],
  providers: [RecipientsFacade],
  templateUrl: './recipients-page.html',
  styleUrl: './recipients-page.css',
})
export class RecipientsPage implements OnInit {
  protected readonly facade = inject(RecipientsFacade);
  private readonly session = inject(SessionStore);
  private readonly onboarding = inject(OnboardingFacade);

  protected readonly rails = RAIL_NAMES;
  protected readonly canManage = computed(() => this.session.can('recipients.manage'));
  /** RegisterRecipientService exige la empresa VERIFIED y dada de alta en el proveedor. */
  protected readonly treasuryEnabled = computed(() => dataOf(this.onboarding.status())?.status === 'VERIFIED');
  protected readonly onboardingLoaded = computed(() => this.onboarding.status().status === 'success');
  protected readonly registered = computed(() => dataOf(this.onboarding.status())?.providerUserId != null);
  protected readonly error = computed(() => errorOf(this.facade.recipients()));
  protected readonly list = computed(() => dataOf(this.facade.recipients()) ?? []);
  protected readonly provider = computed(() => {
    const state = this.facade.providerRecipients();
    return state === null ? null : { data: dataOf(state), error: errorOf(state), loading: state.status === 'loading' };
  });

  protected readonly archiving = signal<Recipient | null>(null);
  protected readonly replacementId = signal('');
  protected readonly archiveError = signal<UserFacingError | null>(null);
  protected readonly announcement = signal('');
  protected readonly replacementOptions = computed(() =>
    this.list().filter((recipient) => recipient.id !== this.archiving()?.id),
  );

  /** Resultado del alta, recibido en el estado de navegación desde «Registrar destinatario». */
  protected readonly registeredNotice = signal<{ name: string; alreadyExisted: boolean } | null>(null);

  ngOnInit(): void {
    const state = history.state as { registered?: unknown; alreadyExisted?: unknown } | null;
    if (typeof state?.registered === 'string') {
      this.registeredNotice.set({ name: state.registered, alreadyExisted: state.alreadyExisted === true });
    }
    void this.facade.loadList();
    if (this.onboarding.status().status !== 'success') {
      this.onboarding.reloadStatus();
    }
  }

  protected startArchive(recipient: Recipient): void {
    this.replacementId.set('');
    this.archiveError.set(null);
    this.archiving.set(recipient);
  }

  protected cancelArchive(): void {
    if (this.facade.busy() !== 'archive') {
      this.archiving.set(null);
    }
  }

  protected async confirmArchive(): Promise<void> {
    const recipient = this.archiving();
    if (!recipient) {
      return;
    }
    const result = await this.facade.archive(recipient.id, this.replacementId() || null);
    if (!result) {
      return;
    }
    if (result.ok) {
      this.archiving.set(null);
      this.announcement.set(`${recipient.name} archivado.`);
      return;
    }
    this.archiveError.set(result.error);
  }

  protected selectReplacement(event: Event): void {
    this.replacementId.set((event.target as HTMLSelectElement).value);
  }
}
