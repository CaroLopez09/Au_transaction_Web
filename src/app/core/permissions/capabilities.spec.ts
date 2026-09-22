import { Capability, roleCan } from './capabilities';
import { parseRole, Role, ROLES } from './role';

/** Matriz de docs/frontend-backend-contract.md §2, derivada de los @PreAuthorize del BFF. */
const EXPECTED: Record<Capability, readonly Role[]> = {
  'onboarding.manage': ['ADMIN'],
  'accounts.open': ['ADMIN'],
  'accounts.simulateDeposit': ['ADMIN'],
  'recipients.manage': ['ADMIN'],
  'payouts.prepare': ['ADMIN'],
  'payouts.approve': ['ADMIN', 'TREASURY_APPROVER'],
  'provider.refresh': ['ADMIN', 'TREASURY_APPROVER'],
  'rfis.manage': ['ADMIN'],
  'rfis.deleteDocuments': ['ADMIN'],
  'activity.audit': ['ADMIN'],
  'activity.manageIncidents': ['ADMIN'],
  'operators.view': ['ADMIN'],
  'operators.manage': ['ADMIN'],
  'platform.console': ['PLATFORM_OPERATOR'],
  'platform.manageSettings': ['PLATFORM_OPERATOR'],
};

describe('roleCan', () => {
  for (const [capability, allowed] of Object.entries(EXPECTED) as [Capability, readonly Role[]][]) {
    for (const role of ROLES) {
      it(`${role} ${allowed.includes(role) ? 'puede' : 'no puede'} ${capability}`, () => {
        expect(roleCan(role, capability)).toBe(allowed.includes(role));
      });
    }
  }

  it('TREASURY_APPROVER no tiene ninguna capacidad de escritura mas alla de aprobar/rechazar y refrescar', () => {
    const permitidas: Capability[] = ['payouts.approve', 'provider.refresh'];
    expect(
      Object.keys(EXPECTED).some(
        (capability) =>
          !permitidas.includes(capability as Capability) && roleCan('TREASURY_APPROVER', capability as Capability),
      ),
    ).toBe(false);
  });

  it('un rol desconocido no obtiene capacidades', () => {
    expect(parseRole('SUPPORT_SYSTEM')).toBeNull();
    expect(roleCan(null, 'payouts.approve')).toBe(false);
  });

  it('interpreta el rol sin distinguir mayúsculas', () => {
    expect(parseRole(' treasury_approver ')).toBe('TREASURY_APPROVER');
  });
});
