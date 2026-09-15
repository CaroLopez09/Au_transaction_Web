import { firstValueFrom, Observable } from 'rxjs';
import { toApiError } from '../../core/http/api-error';
import { mapApiError, UserFacingError } from '../../core/http/error-mapping';

export type RemoteData<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: UserFacingError };

export const loading = <T>(): RemoteData<T> => ({ status: 'loading' });
export const success = <T>(data: T): RemoteData<T> => ({ status: 'success', data });
export const failure = <T>(error: UserFacingError): RemoteData<T> => ({ status: 'error', error });

export function dataOf<T>(value: RemoteData<T>): T | null {
  return value.status === 'success' ? value.data : null;
}

export function errorOf<T>(value: RemoteData<T>): UserFacingError | null {
  return value.status === 'error' ? value.error : null;
}

/** Resultado de una acción de escritura: el valor o el error ya traducido para la interfaz. */
export type ActionResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: UserFacingError };

/** Primer valor de una lectura como RemoteData (los errores del BFF ya mapeados). */
export async function fetchRemote<T>(source: Observable<T>): Promise<RemoteData<T>> {
  try {
    return success(await firstValueFrom(source));
  } catch (error) {
    return failure(mapApiError(toApiError(error)));
  }
}

export async function runAction<T>(source: Observable<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await firstValueFrom(source) };
  } catch (error) {
    return { ok: false, error: mapApiError(toApiError(error)) };
  }
}
