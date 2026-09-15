import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ActivityRepository } from '../domain/activity';

/** Refresco del contador de la campana: los avisos llegan por webhook, sin empuje al navegador. */
const POLL_MS = 60_000;

@Injectable()
export class UnreadNotifications {
  private readonly repository = inject(ActivityRepository);
  private readonly countState = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly count = this.countState.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(): void {
    if (this.timer !== null) {
      return;
    }
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), POLL_MS);
  }

  clear(): void {
    this.countState.set(0);
  }

  async refresh(): Promise<void> {
    try {
      this.countState.set(await firstValueFrom(this.repository.unreadCount()));
    } catch {
      // Un fallo del contador no interrumpe nada: se reintenta en el siguiente ciclo.
    }
  }

  private stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
