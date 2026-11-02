import type { ErpState } from '../../../core/types';
import { leerCsv } from '../../../core/utils/csv';
import type { ConfigMaestro, Valores } from './maestros';
import { validarCampo } from './validacion';

const norm = (t: string): string => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export interface FilaImportada { linea: number; valores?: Valores; errores: string[] }
export interface AnalisisCsv {
  /** Problema que impide leer el archivo completo (faltan columnas, está vacío…). */
  error?: string;
  filas: FilaImportada[];
  /** Columnas del archivo que no corresponden a ningún campo y se ignoran. */
  ignoradas: string[];
}

/**
 * Revisa un CSV contra la configuración del maestro: usa los mismos campos y validaciones que el formulario.
 * Una celda vacía toma el valor por defecto del campo (por ejemplo, Estado = Activo).
 */
export function analizarCsv(texto: string, config: ConfigMaestro, state: ErpState): AnalisisCsv {
  const tabla = leerCsv(texto);
  if (tabla.length < 2) return { error: 'El archivo no tiene filas de datos. Usa la plantilla.', filas: [], ignoradas: [] };

  const [cabecera, ...datos] = tabla;
  const columna = new Map<string, number>();
  for (const c of config.campos) {
    const i = cabecera.findIndex((h) => norm(h) === norm(c.etiqueta) || norm(h) === norm(c.clave));
    if (i >= 0) columna.set(c.clave, i);
  }
  const porDefecto = (clave: string): string => String(config.inicial[clave] ?? '');

  const faltan = config.campos.filter((c) => c.requerido && !columna.has(c.clave) && porDefecto(c.clave) === '');
  if (faltan.length > 0) {
    return { error: `Faltan columnas obligatorias: ${faltan.map((c) => c.etiqueta).join(', ')}.`, filas: [], ignoradas: [] };
  }
  const usadas = new Set(columna.values());
  const ignoradas = cabecera.filter((h, i) => !usadas.has(i) && h.trim() !== '');

  const etiquetaUnico = config.campos.find((c) => c.clave === config.unico)?.etiqueta ?? '';
  const existentes = new Set(
    config.unico ? (state[config.coleccion] as unknown as Valores[]).map((r) => norm(String(r[config.unico!] ?? ''))) : [],
  );
  const vistos = new Map<string, number>();

  const filas = datos.map((fila, k): FilaImportada => {
    const linea = k + 2;   // la fila 1 es la cabecera
    const v: Record<string, string> = {};
    const errores: string[] = [];

    for (const c of config.campos) {
      let valor = columna.has(c.clave) ? (fila[columna.get(c.clave)!] ?? '').trim() : '';
      if (valor === '') valor = porDefecto(c.clave);
      if (c.tipo === 'opciones') {
        const opcion = c.opciones?.(state).find((o) => norm(o.value) === norm(valor) || norm(o.label) === norm(valor));
        if (opcion) v[c.clave] = opcion.value;
        else {
          v[c.clave] = valor;
          errores.push(`${c.etiqueta}: usa ${(c.opciones?.(state) ?? []).map((o) => o.label).join(' o ')}.`);
        }
      } else {
        v[c.clave] = valor;
      }
    }
    for (const c of config.campos) {
      if (c.tipo === 'opciones') continue;
      const err = validarCampo(c, v[c.clave], v);
      if (err) errores.push(`${c.etiqueta}: ${err}`);
    }
    if (config.unico) {
      const clave = norm(v[config.unico]);
      if (clave !== '') {
        if (existentes.has(clave)) errores.push(`${etiquetaUnico}: ya existe en el sistema.`);
        else if (vistos.has(clave)) errores.push(`${etiquetaUnico}: repetido en la fila ${vistos.get(clave)}.`);
        else vistos.set(clave, linea);
      }
    }

    if (errores.length > 0) return { linea, errores };
    const valores: Valores = {};
    for (const c of config.campos) valores[c.clave] = c.tipo === 'numero' ? Number(v[c.clave]) : v[c.clave];
    return { linea, valores, errores };
  });

  return { filas, ignoradas };
}
