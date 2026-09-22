import { Observable } from 'rxjs';

export type NotificationSeverity = 'info' | 'success' | 'attention' | 'critical';

/** Aviso de negocio (NotificationService.NotificationView del BFF). */
export interface AppNotification {
  readonly id: string;
  readonly kind: string;
  readonly severity: NotificationSeverity;
  readonly title: string;
  readonly message: string | null;
  readonly resourceType: string | null;
  readonly resourceId: string | null;
  readonly createdAt: Date | null;
  readonly unread: boolean;
}

export interface NotificationFeed {
  readonly items: readonly AppNotification[];
  readonly unread: number;
}

/** Evento de Kira recibido por el BFF, sin payload. */
export interface ProviderEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly resourceId: string | null;
  readonly status: string | null;
  readonly processed: boolean;
  readonly processingError: string | null;
  readonly retryCount: number;
  /** true cuando el worker automático agotó sus reintentos (WebhookReprojectionWorker.MAX_RETRIES). */
  readonly exhausted: boolean;
  readonly receivedAt: Date | null;
  readonly processedAt: Date | null;
}

export interface AuditEntry {
  readonly id: string;
  readonly action: string;
  readonly resourceType: string | null;
  readonly resourceId: string | null;
  readonly actorName: string | null;
  readonly actorEmail: string | null;
  readonly actorRole: string | null;
  readonly detail: string | null;
  readonly createdAt: Date | null;
}

export abstract class ActivityRepository {
  /** GET /api/notifications */
  abstract notifications(limit: number): Observable<NotificationFeed>;
  /** GET /api/notifications/unread-count */
  abstract unreadCount(): Observable<number>;
  /** POST /api/notifications/read */
  abstract markAllRead(): Observable<void>;
  /** GET /api/events (Administración) */
  abstract events(limit: number): Observable<readonly ProviderEvent[]>;
  /** GET /api/events/incidents: solo eventos con al menos un fallo de proyección (panel de incidencias). */
  abstract incidents(limit: number): Observable<readonly ProviderEvent[]>;
  /** POST /api/events/{eventId}/retry: reintenta ahora, sin esperar al worker programado. */
  abstract retryEvent(eventId: string): Observable<ProviderEvent>;
  /** GET /api/audit (Administración) */
  abstract audit(limit: number): Observable<readonly AuditEntry[]>;
}

/** Ruta del portal a la que lleva un aviso, si su recurso tiene pantalla. */
export function notificationLink(notification: AppNotification): string | null {
  switch (notification.resourceType) {
    case 'payout':
      return notification.resourceId ? `/pagos/${notification.resourceId}` : '/pagos';
    case 'virtual_account':
      return notification.resourceId ? `/cuentas/${notification.resourceId}` : '/cuentas';
    case 'rfi':
      return '/solicitudes';
    case 'tenant':
      return '/vinculacion';
    default:
      return null;
  }
}

/** Nombre legible de las acciones de la bitácora; lo desconocido se muestra tal cual. */
const ACTION_LABELS: Record<string, string> = {
  'tenant.onboarding_registered': 'Alta de la empresa en el proveedor',
  'tenant.onboarding_profile_updated': 'Perfil de vinculación enviado',
  'tenant.kyb_documents_attached': 'Documentos de la empresa enviados',
  'tenant.ubo_saved': 'Beneficiario guardado',
  'tenant.ubo_deleted': 'Beneficiario quitado',
  'tenant.ubos_synced': 'Beneficiarios enviados al proveedor',
  'tenant.ubo_documents_attached': 'Documento de beneficiario enviado',
  'payout.created': 'Pago preparado',
  'payout.approved': 'Pago aprobado',
  'payout.rejected': 'Pago rechazado',
  'payout.submitted': 'Pago enviado al proveedor',
  'recipient.registered': 'Destinatario registrado',
  'recipient.archived': 'Destinatario archivado',
  'quotation.created': 'Cotización creada',
  'virtual_account.opened': 'Cuenta virtual solicitada',
  'compliance.rfis_synced': 'Solicitudes sincronizadas',
  'compliance.rfi_answered': 'Solicitud respondida',
  'compliance.rfi_documents_uploaded': 'Documentos de solicitud subidos',
  'compliance.rfi_document_removed': 'Documento de solicitud eliminado',
  'compliance.rfi_ubo_link_minted': 'Enlace de verificación de beneficiario generado',
  'auth.mfa_enabled': 'Verificación en dos pasos activada',
  'auth.mfa_disabled': 'Verificación en dos pasos desactivada',
  'auth.mfa_verified': 'Ingreso con verificación en dos pasos',
  'auth.mfa_failed': 'Código de verificación incorrecto',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
