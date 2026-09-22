import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { EnvironmentCapabilities } from './environment-capabilities';

describe('EnvironmentCapabilities', () => {
  let service: EnvironmentCapabilities;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EnvironmentCapabilities);
    http = TestBed.inject(HttpTestingController);
  });

  it('antes de preguntar no ofrece herramientas de sandbox', () => {
    expect(service.info().sandbox).toBe(false);
  });

  it('toma del BFF lo que permite el entorno', async () => {
    const loaded = service.load();
    http.expectOne('/api/capabilities').flush({
      sandbox: true,
      providerConfigured: false,
      bank: 'jp_morgan',
      providerApiVersion: '2026-06-01',
      dualApprovalThreshold: 5000,
      supportEmail: 'soporte@juriscop.test',
    });
    await loaded;

    expect(service.info()).toEqual({
      sandbox: true,
      providerConfigured: false,
      bank: 'jp_morgan',
      providerApiVersion: '2026-06-01',
      dualApprovalThreshold: 5000,
      supportEmail: 'soporte@juriscop.test',
    });
  });

  it('si la llamada falla no inventa capacidades', async () => {
    const loaded = service.load();
    http.expectOne('/api/capabilities').flush({}, { status: 503, statusText: 'Service Unavailable' });
    await loaded;

    expect(service.info().sandbox).toBe(false);
    expect(service.info().dualApprovalThreshold).toBeNull();
  });
});
