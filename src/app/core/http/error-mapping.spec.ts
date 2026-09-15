import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { toApiError } from './api-error';
import { mapApiError } from './error-mapping';

const http = (status: number, error: unknown) =>
  new HttpErrorResponse({ status, error, headers: new HttpHeaders(), url: '/api/x' });

describe('toApiError', () => {
  it('lee la forma { code, message, details } del BFF', () => {
    const error = toApiError(
      http(400, { code: 'validation_error', message: 'Datos invalidos.', details: { email: 'no debe estar vacío' } }),
    );
    expect(error).toEqual({
      status: 400,
      code: 'validation_error',
      message: 'Datos invalidos.',
      details: { email: 'no debe estar vacío' },
    });
  });

  it('distingue el 403 sin cuerpo (sin cabecera Authorization) del 403 forbidden', () => {
    expect(toApiError(http(403, null)).code).toBe('session_missing');
    expect(toApiError(http(403, { code: 'forbidden', message: 'x' })).code).toBe('forbidden');
  });

  it('reconoce la falta de red', () => {
    expect(toApiError(http(0, new ProgressEvent('error'))).code).toBe('network_error');
  });

  it('no confía en cuerpos sin code', () => {
    expect(toApiError(http(500, '<html>')).code).toBe('unknown_error');
  });
});

describe('mapApiError', () => {
  it('muestra tal cual las reglas de negocio redactadas por el BFF', () => {
    const mapped = mapApiError(
      toApiError(http(422, { code: 'business_rule_violation', message: 'Credenciales invalidas.' })),
    );
    expect(mapped.description).toBe('Credenciales invalidas.');
    expect(mapped.action).toBe('none');
  });

  it('expone errores por campo para pintarlos junto a cada input', () => {
    const mapped = mapApiError(
      toApiError(
        http(400, { code: 'validation_error', message: 'Datos invalidos.', details: { password: 'x', n: 1 } }),
      ),
    );
    expect(mapped.action).toBe('fix-fields');
    expect(mapped.fieldErrors).toEqual({ password: 'x' });
  });

  it('presenta kira_not_configured como pendiente de configuración, sin reintento', () => {
    const mapped = mapApiError(toApiError(http(503, { code: 'kira_not_configured', message: 'x' })));
    expect(mapped.providerUnavailable).toBe(true);
    expect(mapped.title).toBe('Pendiente de configuración');
    expect(mapped.action).toBe('none');
  });

  it('distingue proveedor caído (502) de rechazo del proveedor (422)', () => {
    expect(mapApiError(toApiError(http(502, { code: 'kira_error', message: 'x' }))).action).toBe('wait');
    expect(mapApiError(toApiError(http(422, { code: 'kira_invalid_bank', message: 'Invalid bank' }))).description).toBe(
      'Invalid bank',
    );
  });

  it('nunca muestra el mensaje técnico de un error interno', () => {
    const mapped = mapApiError(toApiError(http(500, { code: 'internal_error', message: 'NullPointerException' })));
    expect(mapped.description).not.toContain('NullPointerException');
    expect(mapped.action).toBe('retry');
  });

  it('pide volver a ingresar ante un token inválido', () => {
    expect(mapApiError(toApiError(http(401, { code: 'unauthorized', message: 'x' }))).action).toBe('sign-in');
  });
});
