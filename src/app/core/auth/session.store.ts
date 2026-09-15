import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Capability, roleCan } from '../permissions/capabilities';
import { CLOCK } from './clock';
import { isSessionValid, Session, SessionEndReason } from './session';
import { SESSION_PERSISTENCE } from './session-persistence';
import { SessionRepository } from './session.repository';

/** Máximo que admite setTimeout (~24,8 días); el JWT del BFF dura 8 h. */
const MAX_TIMER_MS = 2_147_483_647;

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly repository = inject(SessionRepository);
  private readonly persistence = inject(SESSION_PERSISTENCE);
  private readonly now = inject(CLOCK);

  private readonly state = signal<Session | null>(null);
  private readonly lastEnd = signal<SessionEndReason | null>(null);
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly session = this.state.asReadonly();
  readonly endReason = this.lastEnd.asReadonly();
  readonly isAuthenticated = computed(() => this.state() !== null);
  readonly operator = computed(() => this.state()?.operator ?? null);
  readonly role = computed(() => this.state()?.operator.role ?? null);

  constructor() {
    const stored = this.persistence.read();
    if (stored && isSessionValid(stored, this.now())) {
      this.activate(stored);
    } else if (stored) {
      this.persistence.clear();
    }
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  can(capability: Capability): boolean {
    return roleCan(this.role(), capability);
  }

  accessToken(): string | null {
    const current = this.state();
    if (current && !isSessionValid(current, this.now())) {
      this.end('expired');
      return null;
    }
    return current?.accessToken ?? null;
  }

  async signIn(email: string, password: string): Promise<void> {
    const startedAt = this.now();
    const result = await firstValueFrom(this.repository.signIn(email, password));
    const operator = await firstValueFrom(this.repository.currentOperator(result.accessToken));
    this.activate({
      accessToken: result.accessToken,
      expiresAt: startedAt + result.expiresInSeconds * 1000,
      tenantName: result.tenantName,
      operator,
    });
  }

  /** El BFF no revoca tokens (gap G-04): cerrar sesión descarta el token en este navegador. */
  signOut(): void {
    this.end('signed-out');
  }

  /** Un 401 del BFF o el vencimiento local terminan la sesión con motivo visible en el login. */
  expire(): void {
    if (this.state()) {
      this.end('expired');
    }
  }

  private activate(session: Session): void {
    this.state.set(session);
    this.lastEnd.set(null);
    this.persistence.write(session);
    this.scheduleExpiry(session.expiresAt);
  }

  private end(reason: SessionEndReason): void {
    this.clearTimer();
    this.state.set(null);
    this.lastEnd.set(reason);
    this.persistence.clear();
  }

  private scheduleExpiry(expiresAt: number): void {
    this.clearTimer();
    const delay = Math.min(Math.max(expiresAt - this.now(), 0), MAX_TIMER_MS);
    this.expiryTimer = setTimeout(() => this.expire(), delay);
  }

  private clearTimer(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}
