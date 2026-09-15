import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEsCo from '@angular/common/locales/es-CO';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { SessionHttpRepository } from './core/auth/infrastructure/session-http.repository';
import { SessionRepository } from './core/auth/session.repository';
import { CountryRepository } from './shared/reference/country';
import { CountryHttpRepository } from './shared/reference/country-http.repository';

registerLocaleData(localeEsCo);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    { provide: SessionRepository, useClass: SessionHttpRepository },
    { provide: CountryRepository, useExisting: CountryHttpRepository },
  ],
};
