import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from './app-config';

/** GET /api/capabilities — interfaces/rest/CapabilitiesController.CapabilitiesView */
interface CapabilitiesDto {
  sandbox: boolean;
  providerConfigured: boolean;
  bank?: string;
  providerApiVersion?: string;
  dualApprovalThreshold?: number;
}

/** Lo que este entorno permite, según el BFF. */
export interface EnvironmentInfo {
  /** Entorno de pruebas del proveedor: existe «simular depósito». */
  readonly sandbox: boolean;
  /** Sin credenciales, todo lo que llama al proveedor responde 503: se anuncia, no se reintenta. */
  readonly providerConfigured: boolean;
  readonly bank: string | null;
  readonly providerApiVersion: string | null;
  /** Desde este importe un pago necesita dos firmas; nulo si la empresa no tiene umbral. */
  readonly dualApprovalThreshold: number | null;
}

/**
 * Capacidades del entorno preguntadas al BFF (G-18).
 *
 * Antes se deducían de la compilación del front (`environment.sandboxTools`), así que una
 * compilación equivocada ofrecía botones que siempre fallaban. Hasta que llega la respuesta se
 * asume lo prudente: sin herramientas de sandbox.
 */
@Injectable({ providedIn: 'root' })
export class EnvironmentCapabilities {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_CONFIG).apiBaseUrl;
  private readonly state = signal<EnvironmentInfo>({
    sandbox: false,
    providerConfigured: true,
    bank: null,
    providerApiVersion: null,
    dualApprovalThreshold: null,
  });

  readonly info = this.state.asReadonly();

  async load(): Promise<void> {
    try {
      const dto = await firstValueFrom(this.http.get<CapabilitiesDto>(`${this.baseUrl}/capabilities`));
      this.state.set({
        sandbox: dto.sandbox,
        providerConfigured: dto.providerConfigured,
        bank: dto.bank ?? null,
        providerApiVersion: dto.providerApiVersion ?? null,
        dualApprovalThreshold: dto.dualApprovalThreshold ?? null,
      });
    } catch {
      // Sin respuesta se conserva lo prudente: la pantalla que las use ya muestra su propio error.
    }
  }
}
