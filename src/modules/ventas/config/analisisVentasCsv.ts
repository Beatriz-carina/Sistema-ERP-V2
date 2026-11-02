import type { CondicionPago, ErpState } from '../../../core/types';
import type { DatosDocumentoVenta } from '../../../core/services/erpStore';
import { leerCsv } from '../../../core/utils/csv';

const norm = (t: string): string => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const clave = (t: string): string => norm(t).replace(/[^a-z0-9]/g, '');

type Columna = 'venta' | 'cliente' | 'vendedor' | 'almacen' | 'condicion' | 'producto' | 'cantidad' | 'precio';

/** Columnas del archivo. Una fila por producto vendido; las filas con la misma "Venta" forman una sola factura. */
export const COLUMNAS_VENTAS: Array<{ id: Columna; titulo: string; obligatoria: boolean; alias: string[] }> = [
  { id: 'venta', titulo: 'Venta', obligatoria: true, alias: ['ventaid', 'idventa', 'nventa', 'numeroventa'] },
  { id: 'cliente', titulo: 'Cliente', obligatoria: true, alias: ['clienteid', 'idcliente', 'documento', 'ruc'] },
  { id: 'vendedor', titulo: 'Vendedor', obligatoria: true, alias: ['vendedorid', 'idvendedor'] },
  { id: 'almacen', titulo: 'Almacén', obligatoria: true, alias: ['almacenid', 'idalmacen', 'almacendesalida'] },
  { id: 'condicion', titulo: 'Condición', obligatoria: true, alias: ['condiciondepago', 'pago'] },
  { id: 'producto', titulo: 'Producto', obligatoria: true, alias: ['productoid', 'idproducto', 'codigo'] },
  { id: 'cantidad', titulo: 'Cantidad', obligatoria: true, alias: ['cant'] },
  { id: 'precio', titulo: 'Precio unitario', obligatoria: false, alias: ['precio', 'preciounitariosinigv'] },
];

export interface VentaCsv {
  /** Lo que escribió la persona en la columna Venta. */
  referencia: string;
  /** Filas del archivo que forman esta venta (la 1 es la cabecera, los datos empiezan en la 2). */
  lineas: number[];
  errores: string[];
  datos?: DatosDocumentoVenta;
}

export interface AnalisisVentasCsv {
  error?: string;
  ventas: VentaCsv[];
  totalLineas: number;
  ignoradas: string[];
}

const numero = (t: string): number => Number(/^\d+,\d+$/.test(t) ? t.replace(',', '.') : t);

/**
 * Revisa un CSV de ventas contra los datos del sistema. Cliente, vendedor, almacén y producto se escriben por
 * nombre, código o documento (también sirve el identificador). Lo que no existe no se crea solo.
 * El stock, el límite de crédito y la caja los valida el store al facturar, con las reglas de siempre.
 */
export function analizarVentasCsv(texto: string, state: ErpState): AnalisisVentasCsv {
  const tabla = leerCsv(texto);
  if (tabla.length < 2) return { error: 'El archivo no tiene filas de datos.', ventas: [], totalLineas: 0, ignoradas: [] };

  const [cabecera, ...datos] = tabla;
  const indice = new Map<Columna, number>();
  for (const c of COLUMNAS_VENTAS) {
    const i = cabecera.findIndex((h) => [clave(c.titulo), ...c.alias].includes(clave(h)));
    if (i >= 0) indice.set(c.id, i);
  }
  const faltan = COLUMNAS_VENTAS.filter((c) => c.obligatoria && !indice.has(c.id));
  if (faltan.length > 0) {
    return { error: `Faltan columnas obligatorias: ${faltan.map((c) => c.titulo).join(', ')}.`, ventas: [], totalLineas: 0, ignoradas: [] };
  }
  const usadas = new Set(indice.values());
  const ignoradas = cabecera.filter((h, i) => !usadas.has(i) && h.trim() !== '');

  type Fila = Record<Columna, string> & { linea: number };
  const filas: Fila[] = datos.map((f, k) => {
    const fila = { linea: k + 2 } as Fila;
    for (const c of COLUMNAS_VENTAS) fila[c.id] = indice.has(c.id) ? (f[indice.get(c.id)!] ?? '').trim() : '';
    return fila;
  });

  const grupos = new Map<string, Fila[]>();
  const ventas: VentaCsv[] = [];
  for (const f of filas) {
    if (f.venta === '') { ventas.push({ referencia: `fila ${f.linea}`, lineas: [f.linea], errores: ['Falta el valor de la columna Venta.'] }); continue; }
    grupos.set(f.venta, [...(grupos.get(f.venta) ?? []), f]);
  }

  const activo = <T extends { id: string; estado: string }>(lista: T[], valor: string, textos: (x: T) => string[]): T | undefined => {
    const k = norm(valor);
    return k === '' ? undefined : lista.find((x) => x.estado === 'Activo' && (norm(x.id) === k || textos(x).some((t) => norm(t) === k)));
  };

  for (const [referencia, lineas] of grupos) {
    const errores: string[] = [];
    // El encabezado de la venta puede ir solo en la primera fila: las demás lo heredan si lo dejan vacío.
    const base = lineas[0];

    const cliente = activo(state.clientes, base.cliente, (c) => [c.numeroDocumento, c.razonSocial]);
    const vendedor = activo(state.vendedores, base.vendedor, (v) => [v.nombre, v.documento]);
    const almacen = activo(state.almacenes, base.almacen, (a) => [a.nombre]);
    const k = norm(base.condicion);
    const condicion: CondicionPago | undefined = k.startsWith('contado') ? 'Contado' : k.startsWith('credito') ? 'Crédito' : undefined;
    if (!cliente) errores.push(`Cliente "${base.cliente}" no existe o está inactivo.`);
    if (!vendedor) errores.push(`Vendedor "${base.vendedor}" no existe o está inactivo.`);
    if (!almacen) errores.push(`Almacén "${base.almacen}" no existe o está inactivo.`);
    if (!condicion) errores.push('Condición: usa Contado o Crédito.');

    const detalle: DatosDocumentoVenta['detalle'] = [];
    for (const f of lineas) {
      for (const c of ['cliente', 'vendedor', 'almacen', 'condicion'] as const) {
        if (f !== base && f[c] !== '' && norm(f[c]) !== norm(base[c])) errores.push(`Fila ${f.linea}: ${c} distinto al de la primera fila de la venta.`);
      }
      const producto = activo(state.productos, f.producto, (p) => [p.codigo, p.nombre]);
      if (!producto) { errores.push(`Fila ${f.linea}: producto "${f.producto}" no existe o está inactivo.`); continue; }
      const cantidad = numero(f.cantidad);
      if (!(Number.isFinite(cantidad) && cantidad > 0)) { errores.push(`Fila ${f.linea}: la cantidad debe ser mayor que cero.`); continue; }
      const precio = f.precio === '' ? producto.precioVenta : numero(f.precio);
      if (!(Number.isFinite(precio) && precio >= 0)) { errores.push(`Fila ${f.linea}: el precio no es válido.`); continue; }
      detalle.push({ productoId: producto.id, cantidad, precioUnitario: precio });
    }

    ventas.push({
      referencia, lineas: lineas.map((f) => f.linea), errores,
      datos: errores.length === 0 && cliente && vendedor && almacen && condicion
        ? { clienteId: cliente.id, vendedorId: vendedor.id, almacenId: almacen.id, condicion, detalle }
        : undefined,
    });
  }

  return { ventas, totalLineas: filas.length, ignoradas };
}
