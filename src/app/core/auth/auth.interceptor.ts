import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { APP_CONFIG } from '../configuration/app-config';
import { SESSION_MISSING_CODE, toApiError } from '../http/api-error';
import { SIGN_IN_PATH } from './auth.guards';
import { SessionStore } from './session.store';

/**
 * Adjunta el JWT del BFF y termina la sesión cuando el BFF la rechaza:
 * 401 `unauthorized` (token inválido/caducado) o 403 sin cuerpo (petición sin cabecera).
 * Un 403 `forbidden` NO cierra sesión: es un rol sin permiso y lo resuelve la pantalla.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const baseUrl = inject(APP_CONFIG).apiBaseUrl;
  if (!request.url.startsWith(baseUrl) || request.url === `${baseUrl}/auth/login`) {
    return next(request);
  }

  const session = inject(SessionStore);
  const router = inject(Router);
  const token = session.accessToken();
  const authorized =
    token && !request.headers.has('Authorization')
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && endsSession(error)) {
        session.expire();
        const returnUrl = router.url.startsWith(SIGN_IN_PATH) ? undefined : router.url;
        void router.navigate([SIGN_IN_PATH], { queryParams: returnUrl ? { volver: returnUrl } : {} });
      }
      return throwError(() => error);
    }),
  );
};

function endsSession(error: HttpErrorResponse): boolean {
  const apiError = toApiError(error);
  return apiError.code === 'unauthorized' || apiError.code === SESSION_MISSING_CODE;
}
