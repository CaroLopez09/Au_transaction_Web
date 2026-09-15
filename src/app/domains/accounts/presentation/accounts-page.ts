import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../../core/auth/session.store';
import { UserFacingError } from '../../../core/http/error-mapping';
import { Drawer } from '../../../shared/ui/drawer';
import { ErrorState } from '../../../shared/ui/error-state';
import { MoneyPipe } from '../../../shared/ui/money.pipe';
import { PageHeader } from '../../../shared/ui/page-header';
import { Skeleton } from '../../../shared/ui/skeleton';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { dataOf, errorOf } from '../../../shared/utilities/remote-data';
import { maskTail } from '../../../shared/utilities/mask';
import { OnboardingFacade } from '../../onboarding/application/onboarding.facade';
import { AccountsFacade } from '../application/accounts.facade';
import { accountReadiness } from '../domain/virtual-account';
import { readinessCopy } from './account-copy';

@Component({
  selector: 'au-accounts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeader, ErrorState, Skeleton, StatusBadge, MoneyPipe, RouterLink, Drawer, ReactiveFormsModule],
  providers: [AccountsFacade],
  templateUrl: './accounts-page.html',
  styleUrl: './accounts-page.css',
})
export class AccountsPage implements OnInit {
  protected readonly facade = inject(AccountsFacade);
  private readonly onboarding = inject(OnboardingFacade);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly canOpen = computed(() => this.session.can('accounts.open'));
  /** Regla de OpenVirtualAccountService: KYB aprobado y producto elegible (readyForVirtualAccounts). */
  protected readonly readyToOpen = computed(() => dataOf(this.onboarding.status())?.readyForVirtualAccounts ?? false);
  protected readonly error = computed(() => errorOf(this.facade.accounts()));
  protected readonly rows = computed(() =>
    (dataOf(this.facade.accounts()) ?? []).map((account) => ({
      account,
      readiness: readinessCopy(accountReadiness(account)),
      digits: account.fundsReady ? maskTail(account.accountNumber) : null,
    })),
  );

  protected readonly drawerOpen = signal(false);
  protected readonly openError = signal<UserFacingError | null>(null);
  protected readonly openForm = inject(FormBuilder).nonNullable.group({
    description: [''],
    mode: ['fiat' as 'fiat' | 'crypto'],
  });

  ngOnInit(): void {
    void this.facade.loadList();
    if (this.onboarding.status().status !== 'success') {
      this.onboarding.reloadStatus();
    }
  }

  protected startOpening(): void {
    this.openForm.reset({ description: '', mode: 'fiat' });
    this.openError.set(null);
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (this.facade.busy() !== 'open') {
      this.drawerOpen.set(false);
    }
  }

  protected async submitOpening(): Promise<void> {
    const value = this.openForm.getRawValue();
    const result = await this.facade.open({ description: value.description || null, mode: value.mode });
    if (!result) {
      return;
    }
    if (result.ok) {
      this.drawerOpen.set(false);
      await this.router.navigate(['/cuentas', result.value.id]);
      return;
    }
    this.openError.set(result.error);
  }
}
