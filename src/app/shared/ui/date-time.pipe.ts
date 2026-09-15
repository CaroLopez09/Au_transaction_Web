import { Pipe, PipeTransform } from '@angular/core';

const DATE_TIME = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const DATE = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

/** Fecha en la zona horaria del navegador. `null` → guion largo, nunca una fecha inventada. */
@Pipe({ name: 'auDateTime' })
export class DateTimePipe implements PipeTransform {
  transform(value: Date | null | undefined, style: 'date' | 'date-time' = 'date-time'): string {
    if (!value || Number.isNaN(value.getTime())) {
      return '—';
    }
    return (style === 'date' ? DATE : DATE_TIME).format(value);
  }
}
