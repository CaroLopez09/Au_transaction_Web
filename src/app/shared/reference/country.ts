import { Observable } from 'rxjs';

/** País soportado por el proveedor (CountryView). `alpha3` es el código que piden empresa y beneficiarios. */
export interface Country {
  readonly name: string;
  readonly alpha3: string;
}

/** Puerto del catálogo de países. GET /api/reference/countries llama al proveedor (cache 24 h en el BFF). */
export abstract class CountryRepository {
  abstract countries(): Observable<readonly Country[]>;
}

/** Formato que valida el BFF (@Size 3) y exige el proveedor (ISO-3166 alfa-3). */
export const ISO_ALPHA3_PATTERN = /^[A-Za-z]{3}$/;
