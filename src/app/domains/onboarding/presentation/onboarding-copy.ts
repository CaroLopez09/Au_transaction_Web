import { StatusTone } from '../../../shared/ui/status-badge';
import { LivenessStatus } from '../domain/beneficial-owner';
import { OnboardingStage, OnboardingStatus, USA_VIRTUAL_ACCOUNTS } from '../domain/onboarding-status';

export interface StageCopy {
  readonly label: string;
  readonly tone: StatusTone;
  readonly headline: string;
  /** Qué significa para la organización y qué ocurre después. */
  readonly explanation: string;
  /** Si la etapa espera algo de la organización (bloque de atención en Inicio). */
  readonly awaitsOrganization: boolean;
}

/**
 * Copys de docs/frontend-architecture.md §8. `canManage` = rol con `onboarding.manage`:
 * a quien no puede actuar se le dice quién puede, no se le pide lo imposible.
 */
export function stageCopy(
  stage: OnboardingStage,
  status: Pick<OnboardingStatus, 'companyName' | 'rejectionReason' | 'enhancedDueDiligenceRequired' | 'eligibleProducts'>,
  canManage: boolean,
): StageCopy {
  const companyName = status.companyName;
  const whoActs = canManage ? '' : ' Lo gestiona una persona con rol de Administración.';

  switch (stage) {
    case 'not-started':
      return {
        label: 'Sin iniciar',
        tone: 'attention',
        headline: `La vinculación de ${companyName} no ha comenzado`,
        explanation:
          'El primer paso es dar de alta la empresa ante el proveedor bancario con su razón social, un correo de contacto y el origen de los fondos.' +
          whoActs,
        awaitsOrganization: true,
      };
    case 'information-pending':
      return {
        label: 'Información pendiente',
        tone: 'attention',
        headline: 'El proveedor necesita más información',
        explanation:
          'La verificación empieza sola cuando la empresa y sus beneficiarios tengan todos los datos requeridos.' +
          whoActs,
        awaitsOrganization: true,
      };
    case 'verifying':
      return {
        label: 'Validación en proceso',
        tone: 'progress',
        headline: 'Estamos validando la información de la empresa',
        explanation: 'No hace falta enviar nada más. El estado cambiará cuando el proveedor termine.',
        awaitsOrganization: false,
      };
    case 'in-review':
      return {
        label: 'Revisión de cumplimiento',
        tone: 'progress',
        headline: 'El expediente está en revisión manual',
        explanation:
          'Una persona del equipo del proveedor lo está revisando; en producción puede tardar hasta 24 horas.',
        awaitsOrganization: false,
      };
    case 'product-pending':
      return {
        label: 'Aprobada, producto pendiente',
        tone: 'attention',
        headline: 'La empresa está verificada, pero aún no puede abrir cuentas',
        explanation: productUnavailableReason(status) ?? 'Faltan requisitos específicos del producto de cuentas en EE. UU.' + whoActs,
        awaitsOrganization: productUnavailableReason(status) === null,
      };
    case 'ready':
      return {
        label: 'Lista para operar',
        tone: 'success',
        headline: `${companyName} puede abrir cuentas en EE. UU.`,
        explanation: 'La verificación está aprobada y el producto está habilitado.',
        awaitsOrganization: false,
      };
    case 'rejected':
      return {
        label: 'No aprobada',
        tone: 'critical',
        headline: 'La verificación de la empresa no fue aprobada',
        explanation: status.rejectionReason
          ? `Motivo indicado por el proveedor: ${status.rejectionReason}. Corrige los datos señalados o contacta a soporte de AU.`
          : 'El proveedor no indicó el motivo. Contacta a soporte de AU para conocer la ruta de corrección.',
        awaitsOrganization: true,
      };
    case 'unknown':
      return {
        label: 'Estado en validación',
        tone: 'neutral',
        headline: 'No reconocemos el estado actual de la vinculación',
        explanation: 'No asumimos éxito ni fracaso. Si persiste, contacta a soporte.',
        awaitsOrganization: false,
      };
  }
}

/**
 * `unsupported_reason`: el producto está cerrado y ningún dato lo cambia. Sustituye a los faltantes,
 * así que no se debe pedir a la organización que complete nada.
 */
export function productUnavailableReason(
  status: Pick<OnboardingStatus, 'enhancedDueDiligenceRequired' | 'eligibleProducts'>,
): string | null {
  const product = status.eligibleProducts.find((item) => item.productCode === USA_VIRTUAL_ACCOUNTS);
  if (status.enhancedDueDiligenceRequired || product?.unsupportedReason === 'enhanced_due_diligence_required') {
    return 'La industria de la empresa exige una debida diligencia reforzada que el proveedor aún no ofrece, así que por ahora no se pueden abrir cuentas. No hace falta enviar más datos; contacta a soporte de AU.';
  }
  if (product?.unsupportedReason) {
    return `El proveedor no ofrece este producto a la empresa (${product.unsupportedReason}). Contacta a soporte de AU.`;
  }
  return null;
}

export function livenessCopy(status: LivenessStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case 'PENDING':
      return { label: 'Prueba de vida pendiente', tone: 'attention' };
    case 'COMPLETED':
      return { label: 'Prueba de vida completada', tone: 'success' };
    case 'EXPIRED':
      return { label: 'Enlace vencido', tone: 'neutral' };
    case 'FAILED':
      return { label: 'Prueba de vida fallida', tone: 'critical' };
    case 'UNKNOWN':
      return { label: 'Estado en validación', tone: 'neutral' };
  }
}
