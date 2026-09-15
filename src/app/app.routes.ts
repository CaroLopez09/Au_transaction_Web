import { Routes } from '@angular/router';
import { audienceGuard, authenticatedGuard, capabilityGuard, guestGuard } from './core/auth/auth.guards';
import { OnboardingFacade } from './domains/onboarding/application/onboarding.facade';
import { OnboardingRepository } from './domains/onboarding/domain/onboarding.repository';
import { OnboardingHttpRepository } from './domains/onboarding/infrastructure/onboarding-http.repository';
import { VirtualAccountRepository } from './domains/accounts/domain/virtual-account';
import { VirtualAccountHttpRepository } from './domains/accounts/infrastructure/virtual-account-http.repository';
import { DepositRepository } from './domains/deposits/domain/deposit';
import { DepositHttpRepository } from './domains/deposits/infrastructure/deposit-http.repository';
import { PayoutRepository } from './domains/payouts/domain/payout';
import { QuotationRepository } from './domains/payouts/domain/quotation';
import {
  PayoutHttpRepository,
  QuotationHttpRepository,
} from './domains/payouts/infrastructure/payouts-http.repository';
import { RecipientRepository } from './domains/recipients/domain/recipient';
import { RfiRepository } from './domains/rfis/domain/rfi';
import { RfiHttpRepository } from './domains/rfis/infrastructure/rfi-http.repository';
import { RecipientHttpRepository } from './domains/recipients/infrastructure/recipient-http.repository';
import { ActivityRepository } from './domains/activity/domain/activity';
import { ActivityHttpRepository } from './domains/activity/infrastructure/activity-http.repository';
import { UnreadNotifications } from './domains/activity/presentation/unread-notifications';
import { PlatformRepository } from './domains/platform/domain/platform';
import { PlatformHttpRepository } from './domains/platform/infrastructure/platform-http.repository';

const TITLE_SUFFIX = ' · AU Transactional';

export const routes: Routes = [
  {
    path: 'ingresar',
    title: 'Ingresar' + TITLE_SUFFIX,
    canMatch: [guestGuard],
    loadComponent: () => import('./core/auth/presentation/sign-in-page').then((m) => m.SignInPage),
  },
  {
    path: '',
    canMatch: [authenticatedGuard],
    canActivateChild: [audienceGuard],
    loadComponent: () => import('./core/layout/app-shell').then((m) => m.AppShell),
    // Vinculación la leen Inicio y su propia área: un solo facade por sesión autenticada.
    providers: [
      { provide: OnboardingRepository, useClass: OnboardingHttpRepository },
      OnboardingFacade,
      { provide: VirtualAccountRepository, useClass: VirtualAccountHttpRepository },
      { provide: DepositRepository, useClass: DepositHttpRepository },
      { provide: RecipientRepository, useClass: RecipientHttpRepository },
      { provide: PayoutRepository, useClass: PayoutHttpRepository },
      { provide: QuotationRepository, useClass: QuotationHttpRepository },
      { provide: RfiRepository, useClass: RfiHttpRepository },
      { provide: ActivityRepository, useClass: ActivityHttpRepository },
      { provide: PlatformRepository, useClass: PlatformHttpRepository },
      UnreadNotifications,
    ],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Inicio' + TITLE_SUFFIX,
        loadComponent: () => import('./domains/home/home-page').then((m) => m.HomePage),
      },
      {
        path: 'vinculacion',
        title: 'Vinculación' + TITLE_SUFFIX,
        loadComponent: () => import('./domains/onboarding/presentation/onboarding-page').then((m) => m.OnboardingPage),
      },
      {
        path: 'cuentas',
        title: 'Cuentas' + TITLE_SUFFIX,
        loadComponent: () => import('./domains/accounts/presentation/accounts-page').then((m) => m.AccountsPage),
      },
      {
        path: 'cuentas/:id',
        title: 'Cuenta' + TITLE_SUFFIX,
        loadComponent: () =>
          import('./domains/accounts/presentation/account-detail-page').then((m) => m.AccountDetailPage),
      },
      {
        path: 'depositos',
        title: 'Depósitos' + TITLE_SUFFIX,
        loadComponent: () => import('./domains/deposits/presentation/deposits-page').then((m) => m.DepositsPage),
      },
      {
        path: 'destinatarios',
        title: 'Destinatarios' + TITLE_SUFFIX,
        loadComponent: () => import('./domains/recipients/presentation/recipients-page').then((m) => m.RecipientsPage),
      },
      {
        path: 'destinatarios/nuevo',
        title: 'Registrar destinatario' + TITLE_SUFFIX,
        canMatch: [capabilityGuard('recipients.manage')],
        loadComponent: () =>
          import('./domains/recipients/presentation/new-recipient-page').then((m) => m.NewRecipientPage),
      },
      {
        path: 'pagos',
        title: 'Pagos' + TITLE_SUFFIX,
        loadComponent: () => import('./domains/payouts/presentation/payouts-page').then((m) => m.PayoutsPage),
      },
      {
        path: 'pagos/nuevo',
        title: 'Nuevo pago' + TITLE_SUFFIX,
        canMatch: [capabilityGuard('payouts.prepare')],
        loadComponent: () => import('./domains/payouts/presentation/new-payout-page').then((m) => m.NewPayoutPage),
      },
      {
        path: 'pagos/historial',
        title: 'Historial de pagos' + TITLE_SUFFIX,
        loadComponent: () =>
          import('./domains/payouts/presentation/payout-history-page').then((m) => m.PayoutHistoryPage),
      },
      {
        path: 'pagos/:id',
        title: 'Pago' + TITLE_SUFFIX,
        loadComponent: () =>
          import('./domains/payouts/presentation/payout-detail-page').then((m) => m.PayoutDetailPage),
      },
      {
        path: 'avisos',
        title: 'Avisos' + TITLE_SUFFIX,
        loadComponent: () =>
          import('./domains/activity/presentation/notifications-page').then((m) => m.NotificationsPage),
      },
      {
        path: 'eventos',
        title: 'Eventos del proveedor' + TITLE_SUFFIX,
        canMatch: [capabilityGuard('activity.audit')],
        loadComponent: () => import('./domains/activity/presentation/events-page').then((m) => m.EventsPage),
      },
      {
        path: 'auditoria',
        title: 'Auditoría' + TITLE_SUFFIX,
        canMatch: [capabilityGuard('activity.audit')],
        loadComponent: () => import('./domains/activity/presentation/audit-page').then((m) => m.AuditPage),
      },
      {
        path: 'operaciones',
        title: 'Operaciones' + TITLE_SUFFIX,
        canMatch: [capabilityGuard('platform.console')],
        loadComponent: () => import('./domains/platform/presentation/operations-page').then((m) => m.OperationsPage),
      },
      {
        path: 'operaciones/:id',
        title: 'Ficha del cliente' + TITLE_SUFFIX,
        canMatch: [capabilityGuard('platform.console')],
        loadComponent: () =>
          import('./domains/platform/presentation/tenant-360-page').then((m) => m.Tenant360Page),
      },
      {
        path: 'seguridad',
        title: 'Seguridad' + TITLE_SUFFIX,
        loadComponent: () => import('./core/auth/presentation/security-page').then((m) => m.SecurityPage),
      },
      {
        path: 'solicitudes',
        title: 'Solicitudes de información' + TITLE_SUFFIX,
        loadComponent: () => import('./domains/rfis/presentation/rfis-page').then((m) => m.RfisPage),
      },
      {
        path: 'solicitudes/:id',
        title: 'Solicitud' + TITLE_SUFFIX,
        loadComponent: () => import('./domains/rfis/presentation/rfi-detail-page').then((m) => m.RfiDetailPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
