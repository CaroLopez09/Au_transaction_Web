const KYB_LABELS: Record<string, string> = {
  CREATED: 'Sin completar',
  VERIFYING: 'Validando',
  REVIEW: 'Revisión manual',
  VERIFIED: 'Verificada',
  REJECTED: 'No aprobada',
};

export function kybStatusLabel(status: string): string {
  return KYB_LABELS[status] ?? status;
}
