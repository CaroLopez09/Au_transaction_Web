import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Capability, roleCan } from '../permissions/capabilities';
import { CLOCK } from './clock';
import { isSessionValid, Session, SessionEndReason } from './session';
import { SESSION_PERSISTENCE } from './session-persistence';
import { IdentityResult, IdentityUpload, MfaEnrollment, SessionGrant, SessionRepository } from './session.repository';

/** Lo que falta tras la contraseña: nada, el código, o configurar el segundo factor. */
export type SignInStep =
  | { readonly kind: 'done' }
  | { readonly kind: 'mfa-code'; readonly challenge: string }
  | { readonly kind: 'mfa-setup'; readonly challenge: string }
  | { readonly kind: 'identity' };

/** Máximo que admite setTimeout (~24,8 días); el JWT del BFF dura 8 h. */
const MAX_TIMER_MS = 2_147_483_647;

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly repository = inject(SessionRepository);
  private readonly persistence = inject(SESSION_PERSISTENCE);
  private readonly now = inject(CLOCK);

  private readonly state = signal<Session | null>(null);
  private readonly lastEnd = signal<SessionEndReason | null>(null);
  private readonly identity = signal<{ challenge: string; userId: string } | null>(null);
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly session = this.state.asReadonly();
  readonly endReason = this.lastEnd.asReadonly();
  readonly isAuthenticated = computed(() => this.state() !== null);
  readonly operator = computed(() => this.state()?.operator ?? null);
  readonly role = computed(() => this.state()?.operator.role ?? null);
  readonly identityChallenge = this.identity.asReadonly();

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

  async signIn(email: string, password: string): Promise<SignInStep> {
    const startedAt = this.now();
    const result = await firstValueFrom(this.repository.signIn(email, password));
    if (result.kind === 'mfa') {
      return { kind: result.setupRequired ? 'mfa-setup' : 'mfa-code', challenge: result.challenge };
    }
    if (result.kind === 'identity') {
      this.identity.set({ challenge: result.challenge, userId: result.userId });
      return { kind: 'identity' };
    }
    await this.start(result, startedAt);
    return { kind: 'done' };
  }

  /** Segundo paso del ingreso con MFA. */
  async completeMfa(challenge: string, code: string): Promise<void> {
    const startedAt = this.now();
    await this.start(await firstValueFrom(this.repository.verifyMfa(challenge, code)), startedAt);
  }

  /** Genera el secreto: con el reto del login o, sin reto, para la sesión actual. */
  beginMfaSetup(challenge: string | null): Promise<MfaEnrollment> {
    return firstValueFrom(this.repository.setupMfa(challenge));
  }

  /** Confirma el secreto; el BFF emite una sesión nueva que sustituye a la actual. */
  async confirmMfaSetup(challenge: string | null, code: string): Promise<void> {
    const startedAt = this.now();
    await this.start(await firstValueFrom(this.repository.enableMfa(challenge, code)), startedAt);
  }

  async disableMfa(code: string): Promise<void> {
    await firstValueFrom(this.repository.disableMfa(code));
    const current = this.state();
    if (current) {
      this.activate({ ...current, operator: { ...current.operator, mfaEnabled: false } });
    }
  }

  async completeIdentity(upload: IdentityUpload): Promise<IdentityResult> {
    const challenge = this.identityChallenge();
    if (!challenge) {
      throw new Error('El reto de identidad expiró. Ingresa nuevamente.');
    }
    const result = await firstValueFrom(this.repository.verifyIdentity(challenge.challenge, challenge.userId, upload));
    this.identity.set(null);
    return result;
  }

  private async start(grant: SessionGrant, startedAt: number): Promise<void> {
    const operator = await firstValueFrom(this.repository.currentOperator(grant.accessToken));
    this.activate({
      accessToken: grant.accessToken,
      expiresAt: startedAt + grant.expiresInSeconds * 1000,
      tenantName: grant.tenantName,
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
