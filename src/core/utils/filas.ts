import type { Anulacion, CondicionPago, ErpState, LineaDetalle } from '../types';

/** Un documento listo para mostrarse en una tabla, sin importar de qué módulo viene. */
export interface FilaDocumento {
  id: string;
  numero: string;
  fecha: string;
  tercero: string;
  condicion: CondicionPago;
  estado: string;
  subtotal: number;
  igv: number;
  total: number;
  detalle: LineaDetalle[];
  /** Archivo en Documentos, si el documento genera uno. */
  documentoId: string;
  /** Recorrido del documento: de dónde viene y a dónde va. */
  traza: string[];
  /** Solo si el documento fue anulado. */
  anulacion?: Anulacion;
}

/* ───────── Trazabilidad ───────── */

export function trazaVenta(
  s: ErpState, ancla: { cotizacionId?: string; ordenId?: string; ventaId?: string },
): string[] {
  const buscarOrden = (id: string) => s.ordenesVenta.find((o) => o.id === id);
  const buscarCot = (id: string) => s.cotizaciones.find((c) => c.id === id);
  const buscarVenta = (id: string) => s.ventas.find((v) => v.id === id);

  const cot0 = ancla.cotizacionId ? buscarCot(ancla.cotizacionId) : undefined;
  const ven0 = ancla.ventaId ? buscarVenta(ancla.ventaId) : undefined;
  const orden = (ancla.ordenId ? buscarOrden(ancla.ordenId) : undefined)
    ?? (ven0 ? buscarOrden(ven0.ordenId) : undefined)
    ?? (cot0 && cot0.ordenId ? buscarOrden(cot0.ordenId) : undefined);
  const cot = cot0 ?? (orden && orden.cotizacionId ? buscarCot(orden.cotizacionId) : undefined);
  const venta = ven0 ?? (orden && orden.ventaId ? buscarVenta(orden.ventaId) : undefined);

  const pasos: string[] = [];
  if (cot) pasos.push(`Cotización ${cot.numero}`);
  if (cot?.estado === 'Anulada') return [...pasos, 'Anulada'];
  pasos.push(orden ? `Orden de venta ${orden.numero}` : 'Orden de venta: pendiente');
  if (orden?.estado === 'Anulada') return [...pasos, 'Anulada'];
  pasos.push(venta ? `Factura ${venta.numero}` : 'Factura: pendiente');
  if (venta) pasos.push(venta.estadoPago === 'Pagada' ? 'Cobrada' : 'Cobro pendiente');
  return pasos;
}

export function trazaCompra(s: ErpState, ancla: { ordenId?: string; compraId?: string }): string[] {
  const compra0 = ancla.compraId ? s.compras.find((c) => c.id === ancla.compraId) : undefined;
  const orden = ancla.ordenId
    ? s.ordenesCompra.find((o) => o.id === ancla.ordenId)
    : compra0 ? s.ordenesCompra.find((o) => o.id === compra0.ordenId) : undefined;
  const compra = compra0 ?? (orden && orden.compraId ? s.compras.find((c) => c.id === orden.compraId) : undefined);

  const pasos: string[] = [];
  pasos.push(orden ? `Orden de compra ${orden.numero}` : 'Orden de compra: pendiente');
  if (orden?.estado === 'Anulada') return [...pasos, 'Anulada'];
  pasos.push(compra ? `Recibida en Kardex ${compra.numero}` : 'Kardex: pendiente de recibir');
  if (compra) pasos.push(compra.estadoPago === 'Pagada' ? 'Pagada' : 'Pago pendiente');
  return pasos;
}

/* ───────── Constructores de filas ───────── */

const cliente = (s: ErpState, id: string) => s.clientes.find((c) => c.id === id)?.razonSocial ?? '-';
const proveedor = (s: ErpState, id: string) => s.proveedores.find((p) => p.id === id)?.razonSocial ?? '-';

export const filasCotizaciones = (s: ErpState): FilaDocumento[] =>
  s.cotizaciones.map((c) => ({
    id: c.id, numero: c.numero, fecha: c.fecha, tercero: cliente(s, c.clienteId), condicion: c.condicion,
    estado: c.estado, subtotal: c.subtotal, igv: c.igv, total: c.total, detalle: c.detalle, documentoId: '',
    traza: trazaVenta(s, { cotizacionId: c.id }), anulacion: c.anulacion,
  }));

export const filasOrdenesVenta = (s: ErpState): FilaDocumento[] =>
  s.ordenesVenta.map((o) => ({
    id: o.id, numero: o.numero, fecha: o.fecha, tercero: cliente(s, o.clienteId), condicion: o.condicion,
    estado: o.estado, subtotal: o.subtotal, igv: o.igv, total: o.total, detalle: o.detalle, documentoId: '',
    traza: trazaVenta(s, { ordenId: o.id }), anulacion: o.anulacion,
  }));

export const filasFacturas = (s: ErpState): FilaDocumento[] =>
  s.ventas.map((v) => ({
    id: v.id, numero: v.numero, fecha: v.fecha, tercero: cliente(s, v.clienteId), condicion: v.condicion,
    estado: v.estadoPago, subtotal: v.subtotal, igv: v.igv, total: v.total, detalle: v.detalle,
    documentoId: v.comprobanteId, traza: trazaVenta(s, { ventaId: v.id }),
  }));

export const filasOrdenesCompra = (s: ErpState): FilaDocumento[] =>
  s.ordenesCompra.map((o) => ({
    id: o.id, numero: o.numero, fecha: o.fecha, tercero: proveedor(s, o.proveedorId), condicion: o.condicion,
    estado: o.estado, subtotal: o.subtotal, igv: o.igv, total: o.total, detalle: o.detalle, documentoId: '',
    traza: trazaCompra(s, { ordenId: o.id }), anulacion: o.anulacion,
  }));

export const filasRecepciones = (s: ErpState): FilaDocumento[] =>
  s.compras.map((c) => ({
    id: c.id, numero: c.numero, fecha: c.fecha, tercero: proveedor(s, c.proveedorId), condicion: c.condicion,
    estado: c.estadoPago, subtotal: c.subtotal, igv: c.igv, total: c.total, detalle: c.detalle,
    documentoId: c.facturaId, traza: trazaCompra(s, { compraId: c.id }),
  }));

/** Datos maestros que faltan para poder registrar un documento de venta o de compra. */
export function faltantesDocumento(s: ErpState, modo: 'venta' | 'compra'): string[] {
  const hay = (l: { estado: string }[]) => l.some((x) => x.estado === 'Activo');
  const f: string[] = [];
  if (modo === 'venta') {
    if (!hay(s.clientes)) f.push('un cliente');
    if (!hay(s.vendedores)) f.push('un vendedor');
  } else if (!hay(s.proveedores)) f.push('un proveedor');
  if (!hay(s.almacenes)) f.push('un almacén');
  if (!hay(s.productos)) f.push('un producto');
  return f;
}
