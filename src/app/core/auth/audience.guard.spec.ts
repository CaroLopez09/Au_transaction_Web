import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { audienceGuard } from './auth.guards';
import { SessionStore } from './session.store';

function run(role: string, url: string): boolean | UrlTree {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: SessionStore, useValue: { role: () => role } }],
  });
  return TestBed.runInInjectionContext(
    () => audienceGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot) as boolean | UrlTree,
  );
}

describe('audienceGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('lleva a un operador de la plataforma a la consola si pide un área de empresa', () => {
    const result = run('PLATFORM_OPERATOR', '/pagos');
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/operaciones');
  });

  it('deja al operador de la plataforma en la consola y en seguridad', () => {
    expect(run('PLATFORM_OPERATOR', '/operaciones/juriscop')).toBe(true);
    TestBed.resetTestingModule();
    expect(run('PLATFORM_OPERATOR', '/seguridad')).toBe(true);
  });

  it('no afecta a los roles de empresa', () => {
    expect(run('ADMIN', '/pagos')).toBe(true);
  });
});
