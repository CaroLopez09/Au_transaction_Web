import { describe, expect, it } from 'vitest';
import { Deposit } from '../domain/deposit';
import { depositsToCsv, summarizeDeposits } from './deposit-reconciliation';

function deposit(overrides: Partial<Deposit>): Deposit {
  return {
    id: 'd-1',
    providerDepositId: 'kira-1',
    virtualAccountId: 'va-1',
    grossAmount: 100,
    feeAmount: 2,
    netAmount: 98,
    currency: 'USD',
    senderName: 'Ordenante',
    senderAccount: '****1234',
    rail: 'ACH',
    status: 'COMPLETED',
    rawStatus: 'completed',
    microdeposit: false,
    creditsBalance: true,
    held: false,
    createdAt: new Date('2026-09-01T12:00:00Z'),
    updatedAt: new Date('2026-09-01T12:00:00Z'),
    ...overrides,
  };
}

describe('summarizeDeposits', () => {
  it('agrupa por moneda y estado sumando bruto y neto', () => {
    const rows = summarizeDeposits([
      deposit({ currency: 'USD', status: 'COMPLETED', grossAmount: 100, netAmount: 98 }),
      deposit({ currency: 'USD', status: 'COMPLETED', grossAmount: 50, netAmount: 49 }),
      deposit({ currency: 'USD', status: 'FAILED', grossAmount: 20, netAmount: 20 }),
      deposit({ currency: 'MXN', status: 'COMPLETED', grossAmount: 1000, netAmount: 980 }),
    ]);

    expect(rows).toEqual([
      { currency: 'MXN', status: 'COMPLETED', count: 1, grossTotal: 1000, netTotal: 980 },
      { currency: 'USD', status: 'COMPLETED', count: 2, grossTotal: 150, netTotal: 147 },
      { currency: 'USD', status: 'FAILED', count: 1, grossTotal: 20, netTotal: 20 },
    ]);
  });

  it('sin depósitos no arroja filas', () => {
    expect(summarizeDeposits([])).toEqual([]);
  });
});

describe('depositsToCsv', () => {
  it('incluye encabezado y una fila por depósito', () => {
    const csv = depositsToCsv([deposit({})]);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('fecha,cuenta_virtual,ordenante,riel,estado,moneda,bruto,comision,neto,id_proveedor');
    expect(lines[1]).toBe('2026-09-01T12:00:00.000Z,va-1,Ordenante,ACH,COMPLETED,USD,100,2,98,kira-1');
  });

  it('escapa comas y comillas en el nombre del ordenante', () => {
    const csv = depositsToCsv([deposit({ senderName: 'Empresa, "La Buena" S.A.' })]);
    expect(csv).toContain('"Empresa, ""La Buena"" S.A."');
  });
});
