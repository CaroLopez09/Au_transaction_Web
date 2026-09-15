import { DestroyRef, inject, signal, Signal } from '@angular/core';
import { CLOCK } from '../../core/auth/clock';

/** Hora actual que se actualiza cada `intervalMs` mientras vive el componente que la crea. */
export function tickingClock(intervalMs = 1000): Signal<number> {
  const now = inject(CLOCK);
  const current = signal(now());
  const timer = setInterval(() => current.set(now()), intervalMs);
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
  return current.asReadonly();
}
