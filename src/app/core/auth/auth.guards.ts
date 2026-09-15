import { inject } from '@angular/core';
import { CanActivateChildFn, CanMatchFn, Router, UrlSegment } from '@angular/router';
import { Capability } from '../permissions/capabilities';
import { isPlatformRole } from '../permissions/role';
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

/** Áreas a las que entra un operador de la plataforma; el resto son de empresa. */
const PLATFORM_AREAS = ['/operaciones', '/seguridad'];

/**
 * Un operador de la plataforma no tiene empresa: las áreas de empresa le devolverían vacíos o
 * errores, así que se le lleva a la consola. A la inversa, `platform.console` protege la consola.
 */
export const audienceGuard: CanActivateChildFn = (_child, state) => {
  const session = inject(SessionStore);
  if (!isPlatformRole(session.role())) {
    return true;
  }
  return PLATFORM_AREAS.some((area) => state.url === area || state.url.startsWith(area + '/'))
    ? true
    : inject(Router).createUrlTree(['/operaciones']);
};

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
