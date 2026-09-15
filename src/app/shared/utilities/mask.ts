/** Datos bancarios y documentos nunca completos en listados: solo los últimos cuatro caracteres. */
export function maskTail(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.length <= 4 ? value : `•••• ${value.slice(-4)}`;
}
