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
