import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuLogo } from '../../shared/ui/au-logo';
import { Icon } from '../../shared/ui/icon';
import { SIGN_IN_PATH } from '../auth/auth.guards';
import { SessionStore } from '../auth/session.store';
import { roleLabel } from '../permissions/role';
import { NAVIGATION } from './navigation';

@Component({
  selector: 'au-app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AuLogo, Icon],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  protected readonly operator = this.session.operator;
  protected readonly organization = computed(
    () => this.session.session()?.tenantName ?? this.session.operator()?.tenantId ?? '',
  );
  protected readonly roleName = computed(() => roleLabel(this.session.role()));
  protected readonly items = computed(() =>
    NAVIGATION.filter((item) => item.requires === null || this.session.can(item.requires)),
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));

    // Vencimiento local del JWT mientras la persona está en una pantalla autenticada.
    effect(() => {
      if (!this.session.isAuthenticated()) {
        const returnUrl = this.router.url;
        void this.router.navigate([SIGN_IN_PATH], {
          queryParams: this.session.endReason() === 'expired' && returnUrl !== '/' ? { volver: returnUrl } : {},
        });
      }
    });
  }

  protected signOut(): void {
    this.session.signOut();
  }
}
