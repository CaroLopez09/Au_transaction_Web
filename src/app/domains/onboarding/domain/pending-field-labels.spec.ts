import { describe, expect, it } from 'vitest';
import { pendingFieldLabel } from './pending-field-labels';

describe('pendingFieldLabel', () => {
  it('traduce el nombre técnico del proveedor', () => {
    expect(pendingFieldLabel('business_industry')).toEqual({
      field: 'business_industry',
      label: 'Industria',
      capturable: true,
    });
  });

  it('resuelve los campos por persona con su prefijo', () => {
    expect(pendingFieldLabel('associated_persons:birth_date').label).toBe('Beneficiarios: fecha de nacimiento');
    expect(pendingFieldLabel('associated_persons:algo_nuevo').label).toBe('Beneficiarios finales');
  });

  it('un campo desconocido se muestra tal cual y no se da por perdido', () => {
    expect(pendingFieldLabel('campo_nuevo_del_proveedor')).toEqual({
      field: 'campo_nuevo_del_proveedor',
      label: null,
      capturable: true,
    });
  });

  it('marca como capturables los campos que el asistente puede enviar', () => {
    expect(pendingFieldLabel('transaction_countries').capturable).toBe(true);
    expect(pendingFieldLabel('expected_monthly_payments').capturable).toBe(true);
  });

  it('no ofrece una carga FATCA con un tipo de registro no admitido por Kira', () => {
    expect(pendingFieldLabel('identifying_information:file_fatca').capturable).toBe(false);
  });
});
