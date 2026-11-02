export function aCsv(encabezados: string[], filas: (string | number)[][]): string {
  const esc = (v: string | number): string => {
    const t = String(v);
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return '\ufeff' + [encabezados, ...filas].map((f) => f.map(esc).join(',')).join('\r\n');
}

export function descargarCsv(nombreArchivo: string, contenido: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Lee un CSV y devuelve sus filas como texto. Acepta coma o punto y coma (Excel en español),
 * celdas entre comillas, saltos de línea de Windows y el BOM de UTF-8. Descarta las filas totalmente vacías.
 */
export function leerCsv(texto: string): string[][] {
  const t = texto.replace(/^\ufeff/, '');
  const primera = t.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primera.match(/;/g) ?? []).length > (primera.match(/,/g) ?? []).length ? ';' : ',';
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"') { if (t[i + 1] === '"') { celda += '"'; i++; } else comillas = false; }
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(celda); celda = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      fila.push(celda); celda = ''; filas.push(fila); fila = [];
    } else celda += c;
  }
  if (celda !== '' || fila.length > 0) { fila.push(celda); filas.push(fila); }
  return filas.filter((f) => f.some((x) => x.trim() !== ''));
}
