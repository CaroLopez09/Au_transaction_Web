import { Pipe, PipeTransform } from '@angular/core';

const NUMBER = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/**
 * Importe + moneda tal como los entrega el BFF. Nunca asume moneda: sin código muestra solo la cifra.
 * La moneda va como código (USD, USDC, COPm) y no como símbolo, porque también hay stablecoins.
 * Acepta número (BigDecimal serializado) o texto decimal (vistas proyectadas de Kira).
 */
@Pipe({ name: 'auMoney' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | string | null | undefined, currency?: string | null): string {
    if (amount === null || amount === undefined || amount === '') {
      return '—';
    }
    const value = typeof amount === 'number' ? amount : Number(amount);
    const figure = Number.isFinite(value) ? NUMBER.format(value) : String(amount);
    return currency ? `${figure} ${currency}` : figure;
  }
}
