import { InjectionToken } from '@angular/core';

/** Reloj inyectable para que las reglas de expiración se prueben sin esperar. */
export const CLOCK = new InjectionToken<() => number>('CLOCK', {
  providedIn: 'root',
  factory: () => () => Date.now(),
});
