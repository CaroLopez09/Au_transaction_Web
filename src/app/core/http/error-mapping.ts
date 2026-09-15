import { ApiError, NETWORK_ERROR_CODE, SESSION_MISSING_CODE } from './api-error';

export type RecoveryAction = 'sign-in' | 'retry' | 'fix-fields' | 'wait' | 'none';

/** Lo que la interfaz puede mostrar: qué pasó, qué significa y qué hacer. */
export interface UserFacingError {
  readonly title: string;
  readonly description: string;
  readonly action: RecoveryAction;
  /** Errores por campo tal como los envía el BFF (`details` de validation_error / rfi_answer_rejected). */
  readonly fieldErrors: Readonly<Record<string, string>>;
  /** El proveedor no está configurado en este entorno: estado honesto, no un fallo reintentable. */
  readonly providerUnavailable: boolean;
  readonly source: ApiError;
}

/**
 * Catálogo de docs/frontend-backend-contract.md §3.
 * Los mensajes de `business_rule_violation` los redacta el BFF para el operador y se muestran tal cual:
 * reescribirlos aquí duplicaría reglas de negocio del backend.
 */
export function mapApiError(error: ApiError): UserFacingError {
  const base = { fieldErrors: {}, providerUnavailable: false, source: error };

  if (error.code === NETWORK_ERROR_CODE) {
    return {
      ...base,
      title: 'Sin conexión con el servidor',
      description: 'No pudimos comunicarnos con AU Transactional. Revisa tu conexión e inténtalo de nuevo.',
      action: 'retry',
    };
  }

  switch (error.code) {
    case 'unauthorized':
      return {
        ...base,
        title: 'Tu sesión terminó',
        description: 'Por seguridad, vuelve a ingresar para continuar donde estabas.',
        action: 'sign-in',
      };
    case SESSION_MISSING_CODE:
      return {
        ...base,
        title: 'Necesitas ingresar',
        description: 'Esta sección requiere una sesión activa.',
        action: 'sign-in',
      };
    case 'forbidden':
      return {
        ...base,
        title: 'Tu rol no permite esta acción',
        description: 'Pide a una persona con el rol adecuado de tu organización que la realice.',
        action: 'none',
      };
    case 'validation_error':
      return {
        ...base,
        title: 'Revisa los datos',
        description: error.message ?? 'Algunos campos no son válidos.',
        action: 'fix-fields',
        fieldErrors: stringDetails(error.details),
      };
    case 'rfi_answer_rejected':
      return {
        ...base,
        title: 'No se guardó ninguna respuesta',
        description: error.message ?? 'Corrige los ítems marcados y envía el lote de nuevo.',
        action: 'fix-fields',
        fieldErrors: stringDetails(error.details),
      };
    case 'not_found':
      return {
        ...base,
        title: 'No encontramos lo que buscas',
        description: 'Puede que ya no exista o que pertenezca a otra organización.',
        action: 'none',
      };
    case 'file_too_large':
      return {
        ...base,
        title: 'El archivo es demasiado grande',
        description: error.message ?? 'Elige un archivo más liviano.',
        action: 'fix-fields',
      };
    case 'business_rule_violation':
      return {
        ...base,
        title: 'No se pudo completar la operación',
        description: error.message ?? 'La operación no cumple una regla del sistema.',
        action: 'none',
      };
    case 'kira_not_configured':
      return {
        ...base,
        title: 'Pendiente de configuración',
        description: 'La conexión con el proveedor bancario no está configurada en este entorno.',
        action: 'none',
        providerUnavailable: true,
      };
    case 'internal_error':
      return {
        ...base,
        title: 'Algo falló de nuestro lado',
        description: 'Inténtalo de nuevo en unos minutos. Si continúa, contacta a soporte.',
        action: 'retry',
      };
  }

  if (error.code.startsWith('kira_')) {
    return error.status === 502
      ? {
          ...base,
          title: 'El proveedor bancario no responde',
          description: 'Inténtalo de nuevo en unos minutos.',
          action: 'wait',
        }
      : {
          ...base,
          title: 'El proveedor bancario rechazó la operación',
          description: error.message ?? 'Revisa los datos enviados.',
          action: 'none',
        };
  }

  return {
    ...base,
    title: 'Ocurrió un error inesperado',
    description: 'Inténtalo de nuevo. Si continúa, contacta a soporte.',
    action: 'retry',
  };
}

function stringDetails(details: ApiError['details']): Record<string, string> {
  if (!details) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(details).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}
