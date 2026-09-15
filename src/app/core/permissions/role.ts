/** Constantes de rol tal como viajan en el JWT y en /api/auth/me (domain/tenant/Role.java). */
export const ROLES = [
  'ADMIN',
  'TREASURY_MAKER',
  'TREASURY_APPROVER',
  'COMPLIANCE_INTERNAL',
  'READ_ONLY',
  'PLATFORM_OPERATOR',
] as const;

export type Role = (typeof ROLES)[number];

export function parseRole(raw: string | null | undefined): Role | null {
  const normalized = raw?.trim().toUpperCase();
  return ROLES.find((role) => role === normalized) ?? null;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administración',
  TREASURY_MAKER: 'Tesorería · preparación',
  TREASURY_APPROVER: 'Tesorería · aprobación',
  COMPLIANCE_INTERNAL: 'Cumplimiento',
  READ_ONLY: 'Consulta',
  PLATFORM_OPERATOR: 'Operaciones AU',
};

export function roleLabel(role: Role | null): string {
  return role ? ROLE_LABELS[role] : 'Rol no reconocido';
}

/** Rol de la plataforma (alcance SYSTEM): sin empresa, solo la consola de operaciones. */
export function isPlatformRole(role: Role | null): boolean {
  return role === 'PLATFORM_OPERATOR';
}
