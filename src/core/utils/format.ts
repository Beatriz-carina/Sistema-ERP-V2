export const formatMoneda = (valor: number): string =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(valor);

/** Igual que formatMoneda, pero con el signo separado: - S/ 100.00. */
export const formatMonedaConSigno = (valor: number): string =>
  valor < 0 ? `- ${formatMoneda(Math.abs(valor))}` : formatMoneda(valor);

export const formatFecha = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatFechaHora = (iso: string): string =>
  new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });

const dos = (n: number): string => String(n).padStart(2, '0');

/** Fecha local en formato AAAA-MM-DD, para comparar con los filtros de fecha. */
export const fechaLocal = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
};
