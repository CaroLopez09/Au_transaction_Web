import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { Capability } from '../permissions/capabilities';
import { SessionStore } from './session.store';

export const SIGN_IN_PATH = '/ingresar';

/** Rutas autenticadas. Conserva el destino para volver tras ingresar. */
export const authenticatedGuard: CanMatchFn = (_route, segments: UrlSegment[]) => {
  const session = inject(SessionStore);
  if (session.accessToken()) {
    return true;
  }
  const target = '/' + segments.map((segment) => segment.path).join('/');
  return inject(Router).createUrlTree([SIGN_IN_PATH], {
    queryParams: target !== '/' ? { volver: target } : {},
  });
};

/** El formulario de ingreso no se muestra a quien ya tiene sesión. */
export const guestGuard: CanMatchFn = () => {
  return inject(SessionStore).accessToken() ? inject(Router).createUrlTree(['/']) : true;
};

/** Oculta rutas de escritura a roles sin la capacidad. El BFF sigue siendo quien autoriza. */
export function capabilityGuard(capability: Capability): CanMatchFn {
  return () => inject(SessionStore).can(capability) || inject(Router).createUrlTree(['/']);
}

/** Solo rutas internas: evita redirecciones abiertas con `?volver=https://…` o `//host`. */
export function safeReturnUrl(candidate: string | null | undefined): string {
  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    candidate.startsWith(SIGN_IN_PATH)
  ) {
    return '/';
  }
  return candidate;
}
