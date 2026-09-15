import { HttpErrorResponse } from '@angular/common/http';

/**
 * Error del BFF normalizado. Forma real: `{ code, message, details? }` (RestExceptionHandler).
 * Casos sin cuerpo que el BFF produce y hay que distinguir:
 *  - 403 sin cabecera Authorization → cuerpo vacío.
 *  - status 0 → el navegador no alcanzó el servidor.
 */
export interface ApiError {
  readonly status: number;
  readonly code: string;
  readonly message: string | null;
  readonly details: Readonly<Record<string, unknown>> | null;
  /** X-Request-Id de la respuesta: el código con el que soporte encuentra la petición en los logs del BFF. */
  readonly requestId?: string | null;
}

export const NETWORK_ERROR_CODE = 'network_error';
export const SESSION_MISSING_CODE = 'session_missing';
export const UNKNOWN_ERROR_CODE = 'unknown_error';

export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { status: -1, code: UNKNOWN_ERROR_CODE, message: null, details: null };
  }
  if (error.status === 0) {
    return { status: 0, code: NETWORK_ERROR_CODE, message: null, details: null };
  }

  const requestId = error.headers?.get('X-Request-Id') ?? null;
  const body = readBody(error.error);
  if (body) {
    return { status: error.status, ...body, requestId };
  }
  if (error.status === 403) {
    return { status: 403, code: SESSION_MISSING_CODE, message: null, details: null, requestId };
  }
  return { status: error.status, code: UNKNOWN_ERROR_CODE, message: null, details: null, requestId };
}

function readBody(raw: unknown): Omit<ApiError, 'status'> | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate['code'] !== 'string') {
    return null;
  }
  const details = candidate['details'];
  return {
    code: candidate['code'],
    message: typeof candidate['message'] === 'string' ? candidate['message'] : null,
    details: typeof details === 'object' && details !== null ? (details as Record<string, unknown>) : null,
  };
}
