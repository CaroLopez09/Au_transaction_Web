import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  /** Prefijo relativo del BFF. Nunca un host: en dev lo resuelve el proxy, en despliegue el mismo origen. */
  readonly apiBaseUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  // Lo que permite el entorno (sandbox, proveedor configurado) lo responde el BFF: EnvironmentCapabilities.
  factory: () => ({ apiBaseUrl: environment.apiBaseUrl }),
});
