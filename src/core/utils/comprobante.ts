/** Utilidades del comprobante electrónico (representación impresa simulada). */

const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const ESPECIALES = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const VEINTES = ['VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

/** 0 a 999 en letras. */
function hastaMil(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto]);
    else if (resto < 20) partes.push(ESPECIALES[resto - 10]);
    else if (resto < 30) partes.push(VEINTES[resto - 20]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`);
    }
  }
  return partes.join(' ');
}

/** "UNO" se apocopa a "UN" delante de MIL o MILLONES (veintiún mil, un millón). */
const apocopar = (t: string): string => t.replace(/VEINTIUNO$/, 'VEINTIÚN').replace(/UNO$/, 'UN');

/** Parte entera en letras (hasta 999 999 999). */
export function enteroALetras(n: number): string {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones > 0) partes.push(millones === 1 ? 'UN MILLÓN' : `${apocopar(hastaMil(millones))} MILLONES`);
  if (miles > 0) partes.push(miles === 1 ? 'MIL' : `${apocopar(hastaMil(miles))} MIL`);
  if (resto > 0) partes.push(hastaMil(resto));
  return partes.join(' ');
}

/** 8496 → "OCHO MIL CUATROCIENTOS NOVENTA Y SEIS CON 00/100 SOLES" */
export function montoEnLetras(monto: number): string {
  const centimos = Math.round(monto * 100);
  const entero = Math.floor(centimos / 100);
  const decimales = String(centimos % 100).padStart(2, '0');
  return `${enteroALetras(entero)} CON ${decimales}/100 SOLES`;
}

/** Huella corta y estable del comprobante (simula el "valor resumen" de la firma digital). */
export function resumenSimulado(texto: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < texto.length; i++) {
    h1 = Math.imul(h1 ^ texto.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + texto.charCodeAt(i), 2654435761) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).toUpperCase();
}

/** Código de unidad de medida de SUNAT (catálogo 03). */
export const codigoUnidad = (nombre: string): string =>
  /servicio/i.test(nombre) ? 'ZZ' : 'NIU';

/** Tipo de documento del cliente (catálogo 06): 6 = RUC, 1 = DNI. */
export const tipoDocCliente = (tipo: string): string => (tipo === 'RUC' ? '6' : '1');

/** dd/mm/aaaa */
export const fechaCorta = (iso: string): string => {
  const f = new Date(iso);
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
};

/** aaaa-mm-dd */
export const fechaIso = (iso: string): string => {
  const f = new Date(iso);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
};

/**
 * Texto del código QR, con la estructura de la representación impresa:
 * RUC | tipo de comprobante | serie | número | IGV | total | fecha | tipo doc. cliente | n.º doc. cliente | resumen |
 */
export function textoQr(d: {
  ruc: string; tipo: string; numero: string; igv: number; total: number; fecha: string;
  tipoDocCliente: string; docCliente: string; resumen: string;
}): string {
  const [serie, correlativo] = d.numero.split('-');
  return [d.ruc, d.tipo, serie, correlativo, d.igv.toFixed(2), d.total.toFixed(2), fechaIso(d.fecha),
    d.tipoDocCliente, d.docCliente, d.resumen, ''].join('|');
}
