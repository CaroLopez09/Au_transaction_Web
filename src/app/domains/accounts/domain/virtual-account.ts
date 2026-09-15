import { Observable } from 'rxjs';

export type VirtualAccountStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'FAILED' | 'UNKNOWN';
export type VirtualAccountMode = 'FIAT' | 'CRYPTO' | 'UNKNOWN';

export interface VirtualAccount {
  readonly id: string;
  /** `null` = la apertura no quedó confirmada en el proveedor (el BFF guarda la clave antes de llamarlo). */
  readonly providerAccountId: string | null;
  readonly status: VirtualAccountStatus;
  readonly rawStatus: string;
  readonly mode: VirtualAccountMode;
  readonly bank: string | null;
  readonly bankName: string | null;
  readonly description: string | null;
  readonly accountNumber: string | null;
  readonly routingNumber: string | null;
  readonly currency: string | null;
  readonly availableBalance: number | null;
  readonly balanceRefreshedAt: Date | null;
  /** Un depósito acreditado invalida el saldo cacheado: hay que volver a consultarlo. */
  readonly balanceStale: boolean;
  /** Única señal fiable de que la cuenta puede mover fondos (no basta con `ACTIVE`). */
  readonly fundsReady: boolean;
  readonly activationDelayed: boolean;
  readonly createdAt: Date | null;
}

export type AccountReadiness = 'operational' | 'activating' | 'delayed' | 'not-confirmed' | 'inactive' | 'failed';

/** Orden de las reglas: el backend decide `fundsReady`; el estado solo matiza lo que no es operativo. */
export function accountReadiness(account: VirtualAccount): AccountReadiness {
  if (account.fundsReady) {
    return 'operational';
  }
  if (account.status === 'FAILED') {
    return 'failed';
  }
  if (account.status === 'INACTIVE') {
    return 'inactive';
  }
  if (account.providerAccountId === null) {
    return 'not-confirmed';
  }
  return account.activationDelayed ? 'delayed' : 'activating';
}

/** El BFF rechaza refrescar, consultar saldo o sincronizar depósitos de una cuenta sin id del proveedor. */
export function canQueryProvider(account: VirtualAccount): boolean {
  return account.providerAccountId !== null;
}

export interface OpenVirtualAccount {
  readonly description: string | null;
  /** `null` → el BFF usa `fiat`. Inmutable tras la apertura. */
  readonly mode: 'fiat' | 'crypto' | null;
}

export interface SimulateDeposit {
  readonly amount: number;
  readonly paymentType: 'wire' | 'ach';
}

export abstract class VirtualAccountRepository {
  abstract list(): Observable<readonly VirtualAccount[]>;
  abstract get(id: string): Observable<VirtualAccount>;
  abstract open(command: OpenVirtualAccount): Observable<VirtualAccount>;
  abstract refresh(id: string): Observable<VirtualAccount>;
  abstract refreshBalance(id: string): Observable<VirtualAccount>;
  abstract simulateDeposit(id: string, command: SimulateDeposit): Observable<VirtualAccount>;
}

export function parseAccountStatus(raw: string | null | undefined): VirtualAccountStatus {
  const value = raw?.trim().toUpperCase();
  return value === 'PENDING' || value === 'ACTIVE' || value === 'INACTIVE' || value === 'FAILED' ? value : 'UNKNOWN';
}

export function parseAccountMode(raw: string | null | undefined): VirtualAccountMode {
  const value = raw?.trim().toUpperCase();
  return value === 'FIAT' || value === 'CRYPTO' ? value : 'UNKNOWN';
}
