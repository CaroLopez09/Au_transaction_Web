import { Role } from './role';

/**
 * Espejo de los @PreAuthorize del BFF (docs/frontend-backend-contract.md §2).
 * Solo decide qué se muestra: la autorización real la aplica el backend y un 403 sigue siendo posible.
 * Las lecturas no aparecen aquí porque cualquier sesión válida puede hacerlas.
 */
export const CAPABILITY_ROLES = {
  /** POST/PUT /api/onboarding, POST /api/ubos, /api/ubos/sync, /api/ubos/liveness-links */
  'onboarding.manage': ['ADMIN', 'COMPLIANCE_INTERNAL'],
  /** POST /api/virtual-accounts */
  'accounts.open': ['ADMIN', 'TREASURY_MAKER', 'COMPLIANCE_INTERNAL'],
  /** POST /api/virtual-accounts/{id}/simulate-deposit */
  'accounts.simulateDeposit': ['ADMIN', 'TREASURY_MAKER'],
  /** POST /api/recipients, /api/recipients/{id}/archive */
  'recipients.manage': ['ADMIN', 'TREASURY_MAKER'],
  /** POST /api/payouts/preview, /api/quotations, /api/payouts */
  'payouts.prepare': ['ADMIN', 'TREASURY_MAKER'],
  /** POST /api/payouts/{id}/approve, /reject */
  'payouts.approve': ['ADMIN', 'TREASURY_APPROVER'],
  /** POST /api/rfis/sync, /refresh, PATCH items, documentos */
  'rfis.manage': ['ADMIN', 'COMPLIANCE_INTERNAL'],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof CAPABILITY_ROLES;

export function roleCan(role: Role | null, capability: Capability): boolean {
  if (!role) {
    return false;
  }
  return (CAPABILITY_ROLES[capability] as readonly Role[]).includes(role);
}
