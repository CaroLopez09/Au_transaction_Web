/** ISO-8601 del BFF → Date. Un valor ausente o ilegible es `null`, nunca una fecha inventada. */
export function toDate(value: string | undefined | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
