import { Capability, roleCan } from './capabilities';
import { parseRole, Role, ROLES } from './role';

/** Matriz de docs/frontend-backend-contract.md §2, derivada de los @PreAuthorize del BFF. */
const EXPECTED: Record<Capability, readonly Role[]> = {
  'onboarding.manage': ['ADMIN', 'COMPLIANCE_INTERNAL'],
  'accounts.open': ['ADMIN', 'TREASURY_MAKER', 'COMPLIANCE_INTERNAL'],
  'accounts.simulateDeposit': ['ADMIN', 'TREASURY_MAKER'],
  'recipients.manage': ['ADMIN', 'TREASURY_MAKER'],
  'payouts.prepare': ['ADMIN', 'TREASURY_MAKER'],
  'payouts.approve': ['ADMIN', 'TREASURY_APPROVER'],
  'rfis.manage': ['ADMIN', 'COMPLIANCE_INTERNAL'],
};

describe('roleCan', () => {
  for (const [capability, allowed] of Object.entries(EXPECTED) as [Capability, readonly Role[]][]) {
    for (const role of ROLES) {
      it(`${role} ${allowed.includes(role) ? 'puede' : 'no puede'} ${capability}`, () => {
        expect(roleCan(role, capability)).toBe(allowed.includes(role));
      });
    }
  }

  it('READ_ONLY no tiene ninguna capacidad de escritura', () => {
    expect(Object.keys(EXPECTED).some((capability) => roleCan('READ_ONLY', capability as Capability))).toBe(false);
  });

  it('un rol desconocido no obtiene capacidades', () => {
    expect(parseRole('SUPPORT_SYSTEM')).toBeNull();
    expect(roleCan(null, 'payouts.approve')).toBe(false);
  });

  it('interpreta el rol sin distinguir mayúsculas', () => {
    expect(parseRole(' treasury_maker ')).toBe('TREASURY_MAKER');
  });
});
