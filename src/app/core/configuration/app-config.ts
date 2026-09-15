import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  /** Prefijo relativo del BFF. Nunca un host: en dev lo resuelve el proxy, en despliegue el mismo origen. */
  readonly apiBaseUrl: string;
  readonly sandboxTools: boolean;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => ({ apiBaseUrl: environment.apiBaseUrl, sandboxTools: environment.sandboxTools }),
});
