import { Observable } from 'rxjs';

/** Resumen de una organización en la consola (PlatformConsoleService.TenantSummary). */
export interface TenantSummary {
  readonly id: string;
  readonly name: string;
  readonly providerUserId: string | null;
  readonly status: string;
  readonly verificationTriggered: boolean;
  readonly readyForVirtualAccounts: boolean;
  readonly pendingFields: number;
  readonly rejectionReason: string | null;
  readonly beneficialOwners: number;
  readonly virtualAccounts: number;
  readonly openRfis: number;
  readonly overdueRfis: number;
  readonly heldPayouts: number;
  readonly createdAt: Date | null;
}

export interface ReviewItem {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly kind: string;
  readonly severity: 'critical' | 'attention';
  readonly title: string;
  readonly detail: string | null;
  readonly since: Date | null;
}

/** Usuario existente en Kira Sandbox, visible solo en la consola de operaciones. */
export interface KiraSandboxUser {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly status: string | null;
  readonly externalId: string | null;
}

export interface SandboxTenantImport {
  readonly kiraUserId: string;
  readonly name: string;
  readonly taxId: string | null;
  readonly administrator: {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly password: string;
  };
}

/** Ficha 360: se muestra tal cual la da el BFF, en solo lectura. */
export interface Tenant360 {
  readonly summary: TenantSummary;
  readonly onboarding: {
    readonly status: string;
    readonly pendingFields: readonly string[];
    readonly rejectionReason: string | null;
    readonly readyForVirtualAccounts: boolean;
    readonly enhancedDueDiligenceRequired: boolean;
  };
  readonly beneficialOwners: readonly {
    readonly id: string;
    readonly fullName: string;
    readonly ownershipPercentage: number | null;
    readonly beneficialOwner: boolean;
    readonly livenessStatus: string | null;
    readonly knownToKira: boolean;
  }[];
  readonly accounts: readonly {
    readonly id: string;
    readonly status: string;
    readonly bankName: string | null;
    readonly fundsReady: boolean;
    readonly activationDelayed: boolean;
    readonly availableBalance: number | null;
    readonly currency: string | null;
  }[];
  readonly payouts: readonly {
    readonly id: string;
    readonly status: string;
    readonly approvalState: string;
    readonly amount: number | null;
    readonly currency: string | null;
    readonly createdAt: Date | null;
  }[];
  readonly deposits: readonly {
    readonly id: string;
    readonly status: string;
    readonly netAmount: number | null;
    readonly currency: string | null;
    readonly held: boolean;
    readonly createdAt: Date | null;
  }[];
  readonly rfis: readonly {
    readonly id: string;
    readonly status: string;
    readonly resolutionReason: string | null;
    readonly dueDate: Date | null;
    readonly overdue: boolean;
    readonly blockingType: string | null;
  }[];
}

/** Parametrizacion del portal (arquitectura §8): rieles/tokens/modulos habilitados para la empresa. */
export interface TenantSettingsView {
  readonly tenantId: string;
  readonly enabledRails: readonly string[];
  readonly enabledTokens: readonly string[];
  readonly enabledFeatures: readonly string[];
  readonly availableRails: readonly string[];
  readonly availableTokens: readonly string[];
  readonly availableFeatures: readonly string[];
}

export abstract class PlatformRepository {
  abstract tenants(): Observable<readonly TenantSummary[]>;
  abstract sandboxUsers(): Observable<readonly KiraSandboxUser[]>;
  abstract importSandboxTenant(command: SandboxTenantImport): Observable<void>;
  abstract tenant(id: string): Observable<Tenant360>;
  abstract refresh(id: string): Observable<Tenant360>;
  abstract reviewQueue(): Observable<readonly ReviewItem[]>;
  abstract settings(tenantId: string): Observable<TenantSettingsView>;
  abstract updateSettings(
    tenantId: string,
    enabledRails: readonly string[],
    enabledTokens: readonly string[],
    enabledFeatures: readonly string[],
  ): Observable<TenantSettingsView>;
}
