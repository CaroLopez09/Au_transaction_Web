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

  it('marca lo que el asistente todavía no captura', () => {
    expect(pendingFieldLabel('transaction_countries').capturable).toBe(false);
  });
});
