import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { APP_CONFIG } from '../../core/configuration/app-config';
import { Country, CountryRepository } from './country';

/** application/reference/CountryView (subdivisiones y formato postal no se usan todavía). */
interface CountryViewDto {
  name?: string;
  alpha3?: string;
}

@Injectable({ providedIn: 'root' })
export class CountryHttpRepository extends CountryRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(APP_CONFIG).apiBaseUrl;

  /** Una sola petición por sesión de navegador si tiene éxito; un fallo no se cachea. */
  private cached: Observable<readonly Country[]> | null = null;

  countries(): Observable<readonly Country[]> {
    this.cached ??= this.http
      .get<CountryViewDto[]>(`${this.baseUrl}/reference/countries`)
      .pipe(map(toCountries), shareReplay({ bufferSize: 1, refCount: false }));
    const request = this.cached;
    return new Observable<readonly Country[]>((subscriber) =>
      request.subscribe({
        next: (value) => subscriber.next(value),
        error: (error) => {
          this.cached = null;
          subscriber.error(error);
        },
        complete: () => subscriber.complete(),
      }),
    );
  }
}

export function toCountries(dtos: readonly CountryViewDto[]): Country[] {
  return dtos
    .filter((dto): dto is Required<CountryViewDto> => !!dto.name && !!dto.alpha3)
    .map((dto) => ({ name: dto.name, alpha3: dto.alpha3.toUpperCase() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
