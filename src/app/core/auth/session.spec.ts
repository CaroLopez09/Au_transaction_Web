import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { safeReturnUrl } from './auth.guards';
import { CLOCK } from './clock';
import { Session } from './session';
import { browserSessionPersistence, SESSION_PERSISTENCE, SessionPersistence } from './session-persistence';
import { SessionRepository } from './session.repository';
import { SessionStore } from './session.store';

class FixtureSessionRepository extends SessionRepository {
  signIn = vi.fn(() =>
    of({ kind: 'session' as const, accessToken: 'fixture-token', expiresInSeconds: 28_800, tenantName: 'Fixture' }),
  );
  verifyIdentity = vi.fn(() => of({ status: 'APPROVED', verificationId: 'identity-1' }));
  currentOperator = vi.fn(() =>
    of({
      userId: 'fixture:admin',
      email: 'admin@fixture.test',
      tenantId: 'fixture',
      role: 'ADMIN' as const,
      mfaEnabled: false,
      mfaEnforced: false,
    }),
  );
  verifyMfa = vi.fn(() => of({ accessToken: 'mfa-token', expiresInSeconds: 28_800, tenantName: 'Fixture' }));
  setupMfa = vi.fn(() => of({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x' }));
  enableMfa = vi.fn(() => of({ accessToken: 'enabled-token', expiresInSeconds: 28_800, tenantName: 'Fixture' }));
  disableMfa = vi.fn(() => of(undefined));
}

function memoryPersistence(initial: Session | null = null): SessionPersistence & { value: Session | null } {
  return {
    value: initial,
    read() {
      return this.value;
    },
    write(session) {
      this.value = session;
    },
    clear() {
      this.value = null;
    },
  };
}

const fixtureSession = (expiresAt: number): Session => ({
  accessToken: 'stored-token',
  expiresAt,
  tenantName: 'Fixture',
  operator: {
    userId: 'fixture:approver',
    email: 'approver@fixture.test',
    tenantId: 'fixture',
    role: 'TREASURY_APPROVER',
    mfaEnabled: false,
    mfaEnforced: false,
  },
});

function setup(options: { now?: number; stored?: Session | null } = {}) {
  let now = options.now ?? 1_000_000;
  const persistence = memoryPersistence(options.stored ?? null);
  const repository = new FixtureSessionRepository();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      { provide: SessionRepository, useValue: repository },
      { provide: SESSION_PERSISTENCE, useValue: persistence },
      { provide: CLOCK, useValue: () => now },
    ],
  });
  return {
    store: TestBed.inject(SessionStore),
    persistence,
    repository,
    advance: (ms: number) => (now += ms),
  };
}

describe('SessionStore', () => {
  it('inicia sesión con login + /me y calcula la expiración absoluta', async () => {
    const { store, persistence, repository } = setup({ now: 5_000 });
    await store.signIn('admin@fixture.test', 'secret');
    expect(repository.currentOperator).toHaveBeenCalledWith('fixture-token');
    expect(store.session()?.expiresAt).toBe(5_000 + 28_800_000);
    expect(store.can('payouts.approve')).toBe(true);
    expect(persistence.value?.accessToken).toBe('fixture-token');
  });

  it('con segundo factor la contraseña no abre sesión hasta verificar el código', async () => {
    const { store, repository } = setup({ now: 5_000 });
    repository.signIn.mockReturnValueOnce(
      of({ kind: 'mfa', challenge: 'reto', setupRequired: false, expiresInSeconds: 300 }) as never,
    );

    const step = await store.signIn('admin@fixture.test', 'secret');
    expect(step).toEqual({ kind: 'mfa-code', challenge: 'reto' });
    expect(store.isAuthenticated()).toBe(false);

    await store.completeMfa('reto', '123456');
    expect(repository.verifyMfa).toHaveBeenCalledWith('reto', '123456');
    expect(store.session()?.accessToken).toBe('mfa-token');
  });

  it('si el entorno exige MFA y la cuenta no lo tiene, pide configurarlo y entra al confirmarlo', async () => {
    const { store, repository } = setup();
    repository.signIn.mockReturnValueOnce(
      of({ kind: 'mfa', challenge: 'reto', setupRequired: true, expiresInSeconds: 300 }) as never,
    );

    expect(await store.signIn('admin@fixture.test', 'secret')).toEqual({ kind: 'mfa-setup', challenge: 'reto' });
    await store.beginMfaSetup('reto');
    await store.confirmMfaSetup('reto', '654321');

    expect(repository.enableMfa).toHaveBeenCalledWith('reto', '654321');
    expect(store.session()?.accessToken).toBe('enabled-token');
  });

  it('restaura una sesión guardada vigente y descarta una vencida', () => {
    expect(setup({ now: 10, stored: fixtureSession(100) }).store.isAuthenticated()).toBe(true);
    TestBed.resetTestingModule();
    const expired = setup({ now: 200, stored: fixtureSession(100) });
    expect(expired.store.isAuthenticated()).toBe(false);
    expect(expired.persistence.value).toBeNull();
  });

  it('termina la sesión con motivo "expired" cuando el token vence', () => {
    const { store, advance } = setup({ now: 10, stored: fixtureSession(100) });
    advance(100);
    expect(store.accessToken()).toBeNull();
    expect(store.endReason()).toBe('expired');
  });

  it('cerrar sesión borra el token del navegador', () => {
    const { store, persistence } = setup({ now: 10, stored: fixtureSession(100) });
    store.signOut();
    expect(persistence.value).toBeNull();
    expect(store.endReason()).toBe('signed-out');
  });
});

describe('authInterceptor', () => {
  it('adjunta el Bearer a /api salvo al login', async () => {
    setup({ now: 10, stored: fixtureSession(10_000) });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    void firstValueFrom(http.get('/api/onboarding'));
    expect(controller.expectOne('/api/onboarding').request.headers.get('Authorization')).toBe('Bearer stored-token');

    void firstValueFrom(http.post('/api/auth/login', {}));
    expect(controller.expectOne('/api/auth/login').request.headers.has('Authorization')).toBe(false);
  });

  it('un 401 termina la sesión y lleva al ingreso; un 403 forbidden no', async () => {
    const { store } = setup({ now: 10, stored: fixtureSession(10_000) });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const forbidden = firstValueFrom(http.post('/api/ubos/sync', null)).catch(() => undefined);
    controller
      .expectOne('/api/ubos/sync')
      .flush({ code: 'forbidden', message: 'x' }, { status: 403, statusText: 'Forbidden' });
    await forbidden;
    expect(store.isAuthenticated()).toBe(true);

    const unauthorized = firstValueFrom(http.get('/api/onboarding')).catch(() => undefined);
    controller
      .expectOne('/api/onboarding')
      .flush({ code: 'unauthorized', message: 'x' }, { status: 401, statusText: 'Unauthorized' });
    await unauthorized;
    expect(store.isAuthenticated()).toBe(false);
    expect(store.endReason()).toBe('expired');
    expect(navigate).toHaveBeenCalledWith(['/ingresar'], expect.anything());
  });
});

describe('safeReturnUrl', () => {
  it.each([
    ['/vinculacion', '/vinculacion'],
    [null, '/'],
    ['https://evil.example', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['/ingresar', '/'],
  ])('%s → %s', (candidate, expected) => {
    expect(safeReturnUrl(candidate)).toBe(expected);
  });
});

describe('browserSessionPersistence', () => {
  it('ignora contenido corrupto o manipulado', () => {
    const storage = new Map<string, string>();
    const fake = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    } as unknown as Storage;
    const persistence = browserSessionPersistence(fake);
    storage.set('au.session', '{"accessToken": 1}');
    expect(persistence.read()).toBeNull();
    storage.set('au.session', 'no-json');
    expect(persistence.read()).toBeNull();
  });
});
