import { Observable } from 'rxjs';

export type DepositStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'KYT_PENDING'
  | 'KYT_REJECTED'
  | 'UNKNOWN';
export type Rail = 'ACH' | 'WIRE' | 'WALLET';

export interface Deposit {
  readonly id: string;
  readonly providerDepositId: string | null;
  readonly virtualAccountId: string;
  /** Tres hechos distintos: lo que envió el ordenante, lo que cobró el banco y lo que quedó disponible. */
  readonly grossAmount: number | null;
  readonly feeAmount: number | null;
  readonly netAmount: number | null;
  readonly currency: string | null;
  readonly senderName: string | null;
  /** Llega ya enmascarado por el BFF (`****1234`). */
  readonly senderAccount: string | null;
  readonly rail: Rail | null;
  readonly status: DepositStatus;
  readonly rawStatus: string;
  readonly microdeposit: boolean;
  readonly creditsBalance: boolean;
  /** Retenido por cumplimiento: mientras dure, la cuenta no puede hacer pagos. */
  readonly held: boolean;
  readonly createdAt: Date | null;
  readonly updatedAt: Date | null;
}

export abstract class DepositRepository {
  /** GET /api/deposits?limit — sin paginación ni filtros en el BFF (G-14). */
  abstract list(limit: number): Observable<readonly Deposit[]>;
  abstract listByAccount(accountId: string, limit: number): Observable<readonly Deposit[]>;
  /** POST /api/virtual-accounts/{id}/deposits/sync — trae del proveedor y asienta. */
  abstract syncAccount(accountId: string): Observable<readonly Deposit[]>;
}

/** El BFF acota `limit` a 200. */
export const DEPOSITS_LIMIT = 200;

export function parseDepositStatus(raw: string | null | undefined): DepositStatus {
  const value = raw?.trim().toUpperCase();
  const known: readonly DepositStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'KYT_PENDING', 'KYT_REJECTED'];
  return known.includes(value as DepositStatus) ? (value as DepositStatus) : 'UNKNOWN';
}

export function parseRail(raw: string | null | undefined): Rail | null {
  const value = raw?.trim().toUpperCase();
  return value === 'ACH' || value === 'WIRE' || value === 'WALLET' ? value : null;
}
