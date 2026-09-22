import { Deposit, DepositStatus } from '../domain/deposit';

/** Fila de conciliación: cuánto entró en cada estado, agrupado por moneda para no mezclar totales. */
export interface ReconciliationRow {
  readonly currency: string;
  readonly status: DepositStatus;
  readonly count: number;
  readonly grossTotal: number;
  readonly netTotal: number;
}

/**
 * Resumen de conciliación de depósitos: agrupa por moneda y estado para que finanzas pueda
 * cuadrar lo acreditado contra lo esperado sin descargar el detalle fila por fila.
 */
export function summarizeDeposits(deposits: readonly Deposit[]): readonly ReconciliationRow[] {
  const byKey = new Map<string, ReconciliationRow>();
  for (const deposit of deposits) {
    const currency = deposit.currency ?? '—';
    const key = `${currency}:${deposit.status}`;
    const existing = byKey.get(key);
    const gross = deposit.grossAmount ?? 0;
    const net = deposit.netAmount ?? 0;
    if (existing) {
      byKey.set(key, {
        ...existing,
        count: existing.count + 1,
        grossTotal: existing.grossTotal + gross,
        netTotal: existing.netTotal + net,
      });
    } else {
      byKey.set(key, { currency, status: deposit.status, count: 1, grossTotal: gross, netTotal: net });
    }
  }
  return [...byKey.values()].sort((a, b) => a.currency.localeCompare(b.currency) || a.status.localeCompare(b.status));
}

const CSV_HEADERS = [
  'fecha',
  'cuenta_virtual',
  'ordenante',
  'riel',
  'estado',
  'moneda',
  'bruto',
  'comision',
  'neto',
  'id_proveedor',
] as const;

/** Escapa comillas y envuelve el valor si trae comas, comillas o saltos de línea (RFC 4180). */
function csvCell(value: string | number | null): string {
  const raw = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/** Exportación plana de depósitos a CSV para conciliar en la contabilidad de la organización. */
export function depositsToCsv(deposits: readonly Deposit[]): string {
  const rows = deposits.map((deposit) =>
    [
      deposit.createdAt?.toISOString() ?? '',
      deposit.virtualAccountId,
      deposit.senderName ?? '',
      deposit.rail ?? '',
      deposit.status,
      deposit.currency ?? '',
      deposit.grossAmount ?? '',
      deposit.feeAmount ?? '',
      deposit.netAmount ?? '',
      deposit.providerDepositId ?? '',
    ]
      .map(csvCell)
      .join(','),
  );
  return [CSV_HEADERS.join(','), ...rows].join('\n');
}
