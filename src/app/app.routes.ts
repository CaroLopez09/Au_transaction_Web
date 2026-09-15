import { Routes } from '@angular/router';
import { authenticatedGuard, capabilityGuard, guestGuard } from './core/auth/auth.guards';
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
