import { describe, expect, it } from 'vitest';
import { toOperator } from './operator-http.repository';

describe('toOperator', () => {
  const dto = {
    id: 'u-1',
    email: 'tesoreria@juriscop.test',
    firstName: 'Ana',
    lastName: 'Restrepo',
    fullName: 'Ana Restrepo',
    role: 'TREASURY_APPROVER',
    roleDescription: 'Aprueba y autoriza pagos',
    status: 'ACTIVE',
    active: true,
    mfaEnabled: false,
  };

  it('traduce la vista del BFF al modelo del portal', () => {
    expect(toOperator(dto)).toEqual({
      id: 'u-1',
      email: 'tesoreria@juriscop.test',
      firstName: 'Ana',
      lastName: 'Restrepo',
      fullName: 'Ana Restrepo',
      role: 'TREASURY_APPROVER',
      roleDescription: 'Aprueba y autoriza pagos',
      status: 'ACTIVE',
      active: true,
      mfaEnabled: false,
      identityStatus: 'PENDING_DOCUMENTS',
    });
  });

  it('sin nombre y apellido queda el correo, que siempre está', () => {
    expect(toOperator({ ...dto, firstName: undefined, lastName: undefined, fullName: ' ' }).fullName).toBe(
      'tesoreria@juriscop.test',
    );
  });

  it('un rol que el portal no conoce no rompe la lista', () => {
    const desconocido = toOperator({ ...dto, role: 'SUPPORT_SYSTEM' });
    expect(desconocido.role).toBeNull();
    expect(desconocido.roleDescription).toBe(dto.roleDescription);
  });
});
