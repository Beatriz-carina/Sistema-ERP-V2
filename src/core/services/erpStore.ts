import type {
  ColeccionMaestra, CondicionPago, Empresa, ErpState, LineaDetalle,
  MovimientoInventario, MovimientoBanco, MovimientoCaja, Resultado, Auditoria, SesionCaja,
} from '../types';
import { crearEstadoInicial } from './seed';
import { CLAVE_DEMO, sesion } from './sesion';

/** Máximo de registros por colección. Infinity = sin tope (usa 1 para una demostración corta). */
export const LIMITE_REGISTROS = Infinity;
export const IGV = 0.18;
/** v3: llegan los usuarios y roles de prueba. Cambiar la versión reinicia los datos guardados. */
const STORAGE_KEY = 'erp-enterprise-cloud:v3';
export const DIAS_CREDITO = 30;
export const BUCKET_S3 = 's3://erp-enterprise-cloud-docs';

/* ───────── Núcleo del store ───────── */

/** Estado de partida. Garantiza que sesionesCaja exista aunque el seed todavía no la declare. */
function estadoInicial(): ErpState {
  const base = crearEstadoInicial();
  return { ...base, sesionesCaja: base.sesionesCaja ?? [] };
}

/** El módulo se llamó "Finanzas" por un tiempo: los roles guardados con ese permiso pasan a "tesoreria". */
function migrar(datos: ErpState): ErpState {
  return {
    ...datos,
    roles: datos.roles.map((r) => ({
      ...r,
      permisos: [...new Set(r.permisos.map((p) => (p === 'finanzas' ? 'tesoreria' : p)))],
    })),
  };
}

function cargar(): ErpState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrar({ ...estadoInicial(), ...(JSON.parse(raw) as Partial<ErpState>) });
  } catch {
    /* sin almacenamiento o dato corrupto: se usa el estado inicial */
  }
  return estadoInicial();
}

let state: ErpState = cargar();
const listeners = new Set<() => void>();

type Evento = Omit<Auditoria, 'id' | 'fecha' | 'usuario'>;

/** Nombre del usuario conectado, para la auditoría. */
const usuarioActual = (s: ErpState): string =>
  s.usuarios.find((u) => u.id === sesion.getUsuarioId())?.nombre ?? 'Sin sesión';

function commit(next: ErpState, evento?: Evento): void {
  const auditoria = evento
    ? [...next.auditoria, { ...evento, id: nuevoId('AUD'), fecha: ahora(), usuario: usuarioActual(next) }]
    : next.auditoria;
  state = { ...next, auditoria };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* si no se puede persistir, el ERP sigue funcionando en memoria */
  }
  listeners.forEach((l) => l());
}

const nuevoId = (prefijo: string): string =>
  `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const ahora = (): string => new Date().toISOString();
const r2 = (n: number): number => Math.round(n * 100) / 100;
const sumarDias = (iso: string, dias: number): string => {
  const f = new Date(iso);
  f.setDate(f.getDate() + dias);
  return f.toISOString();
};
const fallo = (error: string): Resultado => ({ ok: false, error });

/** Registra el rechazo en la auditoría. Si se conoce el documento afectado, se indica en registroId. */
function rechazar(modulo: string, accion: string, error: string, registroId = '-'): Resultado {
  commit(state, { modulo, accion, registroId, resultado: 'Rechazado', detalle: error });
  return fallo(error);
}

/* ───────── Consultas ───────── */

export function stockDe(
  movimientos: MovimientoInventario[], productoId: string, almacenId: string,
): number {
  return movimientos
    .filter((m) => m.productoId === productoId && m.almacenId === almacenId)
    .reduce((acc, m) => acc + (m.tipo === 'Entrada' ? m.cantidad : -m.cantidad), 0);
}

export const saldoDeCaja = (caja: MovimientoCaja[]): number =>
  r2(caja.reduce((a, m) => a + (m.tipo === 'Ingreso' ? m.monto : -m.monto), 0));

/** La sesión de caja que está abierta, si hay una. */
export const sesionAbierta = (sesiones: SesionCaja[]): SesionCaja | undefined =>
  sesiones.find((x) => x.estado === 'Abierta');

const CAJA_CERRADA = 'La caja está cerrada. Ábrela en Tesorería > Caja antes de registrar este movimiento de dinero.';

/** Una salida de dinero no puede dejar la caja en negativo: no se paga con dinero que no hay. */
const cajaInsuficiente = (disponible: number, sugerencia: string): string =>
  `Caja no tiene saldo suficiente. Disponible: S/ ${disponible.toFixed(2)}. ${sugerencia}`;

export const saldoCuenta = (movimientos: MovimientoBanco[], cuentaId: string): number =>
  r2(movimientos.filter((m) => m.cuentaId === cuentaId).reduce((a, m) => a + (m.tipo === 'Depósito' ? m.monto : -m.monto), 0));

/* ───────── Mantenimiento ───────── */

const META: Record<ColeccionMaestra, { prefijo: string; etiqueta: string }> = {
  clientes: { prefijo: 'CLI', etiqueta: 'clientes' },
  proveedores: { prefijo: 'PRV', etiqueta: 'proveedores' },
  productos: { prefijo: 'PRD', etiqueta: 'productos' },
  almacenes: { prefijo: 'ALM', etiqueta: 'almacenes' },
  vendedores: { prefijo: 'VEN', etiqueta: 'vendedores' },
  categorias: { prefijo: 'CAT', etiqueta: 'categorías' },
  marcas: { prefijo: 'MAR', etiqueta: 'marcas' },
  unidades: { prefijo: 'UND', etiqueta: 'unidades' },
  monedas: { prefijo: 'MON', etiqueta: 'monedas' },
  usuarios: { prefijo: 'USR', etiqueta: 'usuarios' },
  bancos: { prefijo: 'BCO', etiqueta: 'bancos' },
  cuentasBancarias: { prefijo: 'CTA', etiqueta: 'cuentas bancarias' },
};

function enUso(col: ColeccionMaestra, id: string, s: ErpState): boolean {
  const lineasConProducto = [...s.cotizaciones, ...s.ordenesVenta, ...s.ordenesCompra, ...s.ventas, ...s.compras];
  switch (col) {
    case 'clientes':
      return s.ventas.some((v) => v.clienteId === id) || s.cotizaciones.some((c) => c.clienteId === id)
        || s.ordenesVenta.some((o) => o.clienteId === id);
    case 'proveedores':
      return s.compras.some((c) => c.proveedorId === id) || s.ordenesCompra.some((o) => o.proveedorId === id);
    case 'productos':
      return s.movimientos.some((m) => m.productoId === id)
        || lineasConProducto.some((d) => d.detalle.some((l) => l.productoId === id));
    case 'almacenes':
      return s.movimientos.some((m) => m.almacenId === id) || lineasConProducto.some((d) => d.almacenId === id);
    case 'vendedores':
      return s.ventas.some((v) => v.vendedorId === id) || s.cotizaciones.some((c) => c.vendedorId === id)
        || s.ordenesVenta.some((o) => o.vendedorId === id);
    case 'categorias': return s.productos.some((p) => p.categoriaId === id);
    case 'marcas': return s.productos.some((p) => p.marcaId === id);
    case 'unidades': return s.productos.some((p) => p.unidadId === id);
    case 'monedas': return s.productos.some((p) => p.monedaId === id);
    case 'usuarios': return false;
    case 'bancos': return s.cuentasBancarias.some((c) => c.bancoId === id);
    case 'cuentasBancarias': return s.movimientosBanco.some((m) => m.cuentaId === id);
  }
}

function crearMaestro<K extends ColeccionMaestra>(
  col: K, datos: Omit<ErpState[K][number], 'id'>,
): Resultado {
  const { prefijo, etiqueta } = META[col];
  const lista = state[col] as Array<{ id: string }>;
  if (lista.length >= LIMITE_REGISTROS) {
    return rechazar('Mantenimiento', `Crear en ${etiqueta}`,
      `Se alcanzó el límite de ${LIMITE_REGISTROS} registro en ${etiqueta}.`);
  }
  const id = nuevoId(prefijo);
  commit({ ...state, [col]: [...lista, { ...datos, id }] } as ErpState,
    { modulo: 'Mantenimiento', accion: `Crear en ${etiqueta}`, registroId: id, resultado: 'Exitoso' });
  return { ok: true, id };
}

function actualizarMaestro<K extends ColeccionMaestra>(
  col: K, id: string, cambios: Partial<ErpState[K][number]>,
): Resultado {
  const { etiqueta } = META[col];
  const lista = state[col] as Array<{ id: string }>;
  if (!lista.some((x) => x.id === id)) return fallo('El registro no existe.');
  // Nadie puede dejarse fuera del sistema a sí mismo.
  if (col === 'usuarios' && id === sesion.getUsuarioId() && (cambios as { estado?: string }).estado === 'Inactivo') {
    return rechazar('Administración', 'Editar en usuarios', 'No puedes desactivar al usuario de la sesión actual.');
  }
  const nueva = lista.map((x) => (x.id === id ? { ...x, ...cambios } : x));
  commit({ ...state, [col]: nueva } as ErpState,
    { modulo: 'Mantenimiento', accion: `Editar en ${etiqueta}`, registroId: id, resultado: 'Exitoso' });
  return { ok: true, id };
}

function eliminarMaestro(col: ColeccionMaestra, id: string): Resultado {
  const { etiqueta } = META[col];
  if (col === 'usuarios' && id === sesion.getUsuarioId()) {
    return rechazar('Administración', 'Eliminar en usuarios', 'No puedes eliminar al usuario de la sesión actual.');
  }
  if (enUso(col, id, state)) {
    return rechazar('Mantenimiento', `Eliminar en ${etiqueta}`,
      'No se puede eliminar: el registro ya fue usado en otros módulos.');
  }
  const lista = (state[col] as Array<{ id: string }>).filter((x) => x.id !== id);
  commit({ ...state, [col]: lista } as ErpState,
    { modulo: 'Mantenimiento', accion: `Eliminar en ${etiqueta}`, registroId: id, resultado: 'Exitoso' });
  return { ok: true, id };
}

/* ───────── Operaciones comunes ───────── */

interface LineaEntrada { productoId: string; cantidad: number; precioUnitario: number }

function armarDetalle(lineas: LineaEntrada[]): { detalle: LineaDetalle[]; subtotal: number; igv: number; total: number } {
  const detalle = lineas.map((l) => ({ ...l, subtotal: r2(l.cantidad * l.precioUnitario) }));
  const subtotal = r2(detalle.reduce((a, l) => a + l.subtotal, 0));
  const igv = r2(subtotal * IGV);
  return { detalle, subtotal, igv, total: r2(subtotal + igv) };
}

function lineasValidas(s: ErpState, lineas: LineaEntrada[]): string | null {
  if (lineas.length === 0) return 'Agrega al menos un producto.';
  for (const l of lineas) {
    if (!s.productos.some((p) => p.id === l.productoId && p.estado === 'Activo')) return 'El producto no existe o está inactivo.';
    if (!(l.cantidad > 0)) return 'La cantidad debe ser mayor que cero.';
    if (l.precioUnitario < 0) return 'El precio no puede ser negativo.';
  }
  return null;
}

/** Correlativo del documento. Los comprobantes electrónicos usan 8 dígitos (F001-00000001), como exige SUNAT. */
const numerar = (prefijo: string, cantidadActual: number, digitos = 4): string =>
  `${prefijo}-${String(cantidadActual + 1).padStart(digitos, '0')}`;

/* ───────── Ventas: cotización → orden de venta → facturación → estado de cuenta ───────── */

export interface DatosDocumentoVenta {
  clienteId: string; vendedorId: string; almacenId: string;
  condicion: CondicionPago; detalle: LineaEntrada[];
}

function errorCabeceraVenta(s: ErpState, d: DatosDocumentoVenta): string | null {
  if (!s.clientes.some((c) => c.id === d.clienteId && c.estado === 'Activo')) return 'Selecciona un cliente activo.';
  if (!s.vendedores.some((v) => v.id === d.vendedorId && v.estado === 'Activo')) return 'Selecciona un vendedor activo.';
  if (!s.almacenes.some((a) => a.id === d.almacenId && a.estado === 'Activo')) return 'Selecciona un almacén activo.';
  return lineasValidas(s, d.detalle);
}

function registrarCotizacion(d: DatosDocumentoVenta): Resultado {
  const M = 'Ventas', A = 'Registrar cotización';
  const s = state;
  if (s.cotizaciones.length >= LIMITE_REGISTROS) return rechazar(M, A, `Se alcanzó el límite de ${LIMITE_REGISTROS} registro en cotizaciones.`);
  const err = errorCabeceraVenta(s, d);
  if (err) return rechazar(M, A, err);

  const id = nuevoId('COT');
  const numero = numerar('COT', s.cotizaciones.length);
  commit({
    ...s,
    cotizaciones: [...s.cotizaciones, { id, numero, fecha: ahora(), ...d, ...armarDetalle(d.detalle), estado: 'Pendiente', ordenId: '' }],
  }, { modulo: M, accion: A, registroId: numero, resultado: 'Exitoso' });
  return { ok: true, id };
}

function aceptarCotizacion(cotizacionId: string): Resultado {
  const M = 'Ventas', A = 'Aceptar cotización';
  const s = state;
  const cot = s.cotizaciones.find((c) => c.id === cotizacionId);
  if (!cot) return rechazar(M, A, 'La cotización no existe.');
  if (cot.estado !== 'Pendiente') return rechazar(M, A, cot.estado === 'Anulada' ? 'La cotización está anulada.' : 'La cotización ya fue aceptada.', cot.numero);
  if (s.ordenesVenta.length >= LIMITE_REGISTROS) return rechazar(M, A, `Se alcanzó el límite de ${LIMITE_REGISTROS} registro en órdenes de venta.`);

  const ordenId = nuevoId('OVT');
  const numero = numerar('OV', s.ordenesVenta.length);
  commit({
    ...s,
    cotizaciones: s.cotizaciones.map((c) => (c.id === cotizacionId ? { ...c, estado: 'Aceptada', ordenId } : c)),
    ordenesVenta: [...s.ordenesVenta, {
      id: ordenId, numero, fecha: ahora(), cotizacionId: cot.id, clienteId: cot.clienteId, vendedorId: cot.vendedorId,
      almacenId: cot.almacenId, condicion: cot.condicion, detalle: cot.detalle, subtotal: cot.subtotal, igv: cot.igv,
      total: cot.total, estado: 'Pendiente', ventaId: '',
    }],
  }, { modulo: M, accion: A, registroId: `${cot.numero} a ${numero}`, resultado: 'Exitoso' });
  return { ok: true, id: ordenId };
}

function registrarOrdenVenta(d: DatosDocumentoVenta): Resultado {
  const M = 'Ventas', A = 'Registrar orden de venta';
  const s = state;
  if (s.ordenesVenta.length >= LIMITE_REGISTROS) return rechazar(M, A, `Se alcanzó el límite de ${LIMITE_REGISTROS} registro en órdenes de venta.`);
  const err = errorCabeceraVenta(s, d);
  if (err) return rechazar(M, A, err);

  const id = nuevoId('OVT');
  const numero = numerar('OV', s.ordenesVenta.length);
  commit({
    ...s,
    ordenesVenta: [...s.ordenesVenta, {
      id, numero, fecha: ahora(), cotizacionId: '', ...d, ...armarDetalle(d.detalle), estado: 'Pendiente', ventaId: '',
    }],
  }, { modulo: M, accion: A, registroId: numero, resultado: 'Exitoso' });
  return { ok: true, id };
}

/** Emite la factura de una orden de venta: descuenta stock, archiva el comprobante y abre el estado de cuenta. */
function facturarOrdenVenta(ordenId: string): Resultado {
  const M = 'Ventas', A = 'Emitir factura';
  const s = state;
  const orden = s.ordenesVenta.find((o) => o.id === ordenId);
  if (!orden) return rechazar(M, A, 'La orden de venta no existe.');
  // Solo una orden Pendiente se factura: ni una ya facturada ni una anulada.
  if (orden.estado !== 'Pendiente') return rechazar(M, A, orden.estado === 'Anulada' ? 'La orden está anulada.' : 'La orden ya fue facturada.', orden.numero);
  if (s.ventas.length >= LIMITE_REGISTROS) return rechazar(M, A, `Se alcanzó el límite de ${LIMITE_REGISTROS} registro en facturas.`, orden.numero);

  const cliente = s.clientes.find((c) => c.id === orden.clienteId && c.estado === 'Activo');
  if (!cliente) return rechazar(M, A, 'El cliente de la orden ya no está activo.', orden.numero);
  if (orden.condicion === 'Crédito' && orden.total > cliente.limiteCredito) {
    return rechazar(M, A, 'El total supera el límite de crédito del cliente.', orden.numero);
  }

  const fecha = ahora();
  const numero = numerar('F001', s.ventas.length, 8);
  const movimientos: MovimientoInventario[] = [];
  for (const l of orden.detalle) {
    const disponible = stockDe([...s.movimientos, ...movimientos], l.productoId, orden.almacenId);
    if (disponible < l.cantidad) {
      return rechazar(M, A, `Stock insuficiente: disponible ${disponible}, solicitado ${l.cantidad}.`, orden.numero);
    }
    movimientos.push({
      id: nuevoId('MOV'), fecha, tipo: 'Salida', origen: 'Venta', documentoNumero: numero,
      productoId: l.productoId, almacenId: orden.almacenId, cantidad: l.cantidad, saldo: disponible - l.cantidad,
    });
  }

  // Una venta al contado entra dinero a Caja, así que la caja debe estar abierta.
  if (orden.condicion === 'Contado' && !sesionAbierta(s.sesionesCaja)) return rechazar(M, A, CAJA_CERRADA, orden.numero);

  const contado = orden.condicion === 'Contado';
  const ventaId = nuevoId('VTA');
  const comprobanteId = nuevoId('DOC');
  const nombreArchivo = `${numero}.pdf`;

  commit({
    ...s,
    ventas: [...s.ventas, {
      id: ventaId, numero, fecha, clienteId: orden.clienteId, vendedorId: orden.vendedorId, almacenId: orden.almacenId,
      condicion: orden.condicion, detalle: orden.detalle, subtotal: orden.subtotal, igv: orden.igv, total: orden.total,
      estado: 'Emitida', comprobanteId, ordenId: orden.id, estadoPago: contado ? 'Pagada' : 'Pendiente',
    }],
    ordenesVenta: s.ordenesVenta.map((o) => (o.id === orden.id ? { ...o, estado: 'Facturada', ventaId } : o)),
    movimientos: [...s.movimientos, ...movimientos],
    cuentas: [...s.cuentas, {
      id: nuevoId('CXC'), tipo: 'Cobrar', documentoNumero: numero, terceroId: orden.clienteId, monto: orden.total,
      saldo: contado ? 0 : orden.total, vencimiento: contado ? fecha : sumarDias(fecha, DIAS_CREDITO),
      estado: contado ? 'Cancelada' : 'Pendiente',
    }],
    caja: contado
      ? [...s.caja, { id: nuevoId('CAJ'), fecha, tipo: 'Ingreso', concepto: `Cobro ${numero}`, monto: orden.total, documentoNumero: numero }]
      : s.caja,
    documentos: [...s.documentos, {
      id: comprobanteId, nombre: nombreArchivo, tipo: 'Comprobante de venta', tamanoKb: 118,
      fecha, entidad: 'Venta', entidadId: ventaId, rutaS3: `${BUCKET_S3}/comprobantes/${nombreArchivo}`,
    }],
  }, { modulo: M, accion: A, registroId: numero, resultado: 'Exitoso' });
  return { ok: true, id: ventaId };
}

/* ───────── Compras: orden de compra → Kardex (recepción) → estado de cuenta ───────── */

export interface DatosOrdenCompra {
  proveedorId: string; almacenId: string; condicion: CondicionPago; detalle: LineaEntrada[];
}

function registrarOrdenCompra(d: DatosOrdenCompra): Resultado {
  const M = 'Compras', A = 'Registrar orden de compra';
  const s = state;
  if (s.ordenesCompra.length >= LIMITE_REGISTROS) return rechazar(M, A, `Se alcanzó el límite de ${LIMITE_REGISTROS} registro en órdenes de compra.`);
  if (!s.proveedores.some((p) => p.id === d.proveedorId && p.estado === 'Activo')) return rechazar(M, A, 'Selecciona un proveedor activo.');
  if (!s.almacenes.some((a) => a.id === d.almacenId && a.estado === 'Activo')) return rechazar(M, A, 'Selecciona un almacén activo.');
  const errLinea = lineasValidas(s, d.detalle);
  if (errLinea) return rechazar(M, A, errLinea);

  const id = nuevoId('ORC');
  const numero = numerar('OC', s.ordenesCompra.length);
  commit({
    ...s,
    ordenesCompra: [...s.ordenesCompra, { id, numero, fecha: ahora(), ...d, ...armarDetalle(d.detalle), estado: 'Pendiente', compraId: '' }],
  }, { modulo: M, accion: A, registroId: numero, resultado: 'Exitoso' });
  return { ok: true, id };
}

/** Recibe la orden en Kardex: entra el stock, se archiva la factura y se abre el estado de cuenta. */
function recibirOrdenCompra(ordenId: string): Resultado {
  const M = 'Compras', A = 'Recibir en Kardex';
  const s = state;
  const orden = s.ordenesCompra.find((o) => o.id === ordenId);
  if (!orden) return rechazar(M, A, 'La orden de compra no existe.');
  // Solo una orden Pendiente se recibe: ni una ya recibida ni una anulada.
  if (orden.estado !== 'Pendiente') return rechazar(M, A, orden.estado === 'Anulada' ? 'La orden está anulada.' : 'La orden ya fue recibida.', orden.numero);
  if (s.compras.length >= LIMITE_REGISTROS) return rechazar(M, A, `Se alcanzó el límite de ${LIMITE_REGISTROS} registro en recepciones.`, orden.numero);
  if (!s.proveedores.some((p) => p.id === orden.proveedorId && p.estado === 'Activo')) return rechazar(M, A, 'El proveedor de la orden ya no está activo.', orden.numero);
  // Una compra al contado saca dinero de Caja: la caja debe estar abierta y alcanzar para pagarla.
  if (orden.condicion === 'Contado') {
    if (!sesionAbierta(s.sesionesCaja)) return rechazar(M, A, CAJA_CERRADA, orden.numero);
    const disponible = saldoDeCaja(s.caja);
    if (orden.total > disponible) {
      return rechazar(M, A, cajaInsuficiente(disponible, 'Abre la caja con más dinero o registra la compra a crédito.'), orden.numero);
    }
  }

  const fecha = ahora();
  const numero = numerar('REC', s.compras.length);
  const movimientos: MovimientoInventario[] = [];
  for (const l of orden.detalle) {
    const actual = stockDe([...s.movimientos, ...movimientos], l.productoId, orden.almacenId);
    movimientos.push({
      id: nuevoId('MOV'), fecha, tipo: 'Entrada', origen: 'Compra', documentoNumero: numero,
      productoId: l.productoId, almacenId: orden.almacenId, cantidad: l.cantidad, saldo: actual + l.cantidad,
    });
  }

  const contado = orden.condicion === 'Contado';
  const compraId = nuevoId('CMP');
  const facturaId = nuevoId('DOC');
  const nombreArchivo = `${numero}.pdf`;

  commit({
    ...s,
    compras: [...s.compras, {
      id: compraId, numero, fecha, proveedorId: orden.proveedorId, almacenId: orden.almacenId, condicion: orden.condicion,
      detalle: orden.detalle, subtotal: orden.subtotal, igv: orden.igv, total: orden.total, estado: 'Recibida', facturaId,
      ordenId: orden.id, estadoPago: contado ? 'Pagada' : 'Pendiente',
    }],
    ordenesCompra: s.ordenesCompra.map((o) => (o.id === orden.id ? { ...o, estado: 'Recibida', compraId } : o)),
    movimientos: [...s.movimientos, ...movimientos],
    cuentas: [...s.cuentas, {
      id: nuevoId('CXP'), tipo: 'Pagar', documentoNumero: numero, terceroId: orden.proveedorId, monto: orden.total,
      saldo: contado ? 0 : orden.total, vencimiento: contado ? fecha : sumarDias(fecha, DIAS_CREDITO),
      estado: contado ? 'Cancelada' : 'Pendiente',
    }],
    caja: contado
      ? [...s.caja, { id: nuevoId('CAJ'), fecha, tipo: 'Egreso', concepto: `Pago ${numero}`, monto: orden.total, documentoNumero: numero }]
      : s.caja,
    documentos: [...s.documentos, {
      id: facturaId, nombre: nombreArchivo, tipo: 'Factura de proveedor', tamanoKb: 96,
      fecha, entidad: 'Compra', entidadId: compraId, rutaS3: `${BUCKET_S3}/facturas/${nombreArchivo}`,
    }],
  }, { modulo: M, accion: A, registroId: numero, resultado: 'Exitoso' });
  return { ok: true, id: compraId };
}

/* ───────── Anulación de documentos pendientes ───────── */

/** Un documento solo se anula mientras está Pendiente. No se borra: queda Anulada con su motivo. */
type ColeccionAnulable = 'cotizaciones' | 'ordenesVenta' | 'ordenesCompra';

const SIGUIENTE_PASO: Record<ColeccionAnulable, string> = {
  cotizaciones: 'Ya fue aceptada: anula su orden de venta.',
  ordenesVenta: 'Ya fue facturada: corresponde una devolución.',
  ordenesCompra: 'Ya fue recibida: corresponde una devolución al proveedor.',
};

function anular(col: ColeccionAnulable, modulo: string, accion: string, id: string, motivo: string): Resultado {
  const doc = state[col].find((d) => d.id === id);
  if (!doc) return rechazar(modulo, accion, 'El documento no existe.');
  if (doc.estado === 'Anulada') return rechazar(modulo, accion, 'El documento ya está anulado.', doc.numero);
  if (doc.estado !== 'Pendiente') return rechazar(modulo, accion, `No se puede anular. ${SIGUIENTE_PASO[col]}`, doc.numero);
  const texto = motivo.trim();
  if (texto.length < 5) return fallo('Escribe el motivo de la anulación (mínimo 5 caracteres).');

  const anulacion = { fecha: ahora(), usuario: usuarioActual(state), motivo: texto };
  commit({
    ...state,
    [col]: (state[col] as Array<{ id: string }>).map((d) => (d.id === id ? { ...d, estado: 'Anulada', anulacion } : d)),
  } as ErpState, { modulo, accion, registroId: doc.numero, resultado: 'Exitoso', detalle: texto });
  return { ok: true, id };
}

const anularCotizacion = (id: string, motivo: string) => anular('cotizaciones', 'Ventas', 'Anular cotización', id, motivo);
const anularOrdenVenta = (id: string, motivo: string) => anular('ordenesVenta', 'Ventas', 'Anular orden de venta', id, motivo);
const anularOrdenCompra = (id: string, motivo: string) => anular('ordenesCompra', 'Compras', 'Anular orden de compra', id, motivo);

/* ───────── Inventario ───────── */

export interface DatosAjuste {
  productoId: string; almacenId: string; tipo: 'Entrada' | 'Salida'; cantidad: number; motivo: string;
}

function registrarAjuste(d: DatosAjuste): Resultado {
  const M = 'Inventario', A = 'Registrar ajuste';
  const s = state;
  if (!s.productos.some((p) => p.id === d.productoId && p.estado === 'Activo')) return rechazar(M, A, 'Selecciona un producto activo.');
  if (!s.almacenes.some((a) => a.id === d.almacenId && a.estado === 'Activo')) return rechazar(M, A, 'Selecciona un almacén activo.');
  if (!Number.isInteger(d.cantidad) || d.cantidad <= 0) return rechazar(M, A, 'La cantidad debe ser un entero mayor que cero.');
  if (d.motivo.trim() === '') return rechazar(M, A, 'Indica el motivo del ajuste.');

  const actual = stockDe(s.movimientos, d.productoId, d.almacenId);
  if (d.tipo === 'Salida' && d.cantidad > actual) return rechazar(M, A, `Stock insuficiente. Disponible: ${actual}.`);

  const numero = `AJ-${String(s.movimientos.filter((m) => m.origen === 'Ajuste').length + 1).padStart(4, '0')}`;
  const id = nuevoId('MOV');
  commit({
    ...s,
    movimientos: [...s.movimientos, {
      id, fecha: ahora(), tipo: d.tipo, origen: 'Ajuste', documentoNumero: numero,
      productoId: d.productoId, almacenId: d.almacenId, cantidad: d.cantidad,
      saldo: d.tipo === 'Entrada' ? actual + d.cantidad : actual - d.cantidad, motivo: d.motivo.trim(),
    }],
  }, { modulo: M, accion: A, registroId: numero, resultado: 'Exitoso', detalle: d.motivo.trim() });
  return { ok: true, id };
}

/* ───────── Tesorería: cobros (por cobrar) y pagos (por pagar) ───────── */

/** Cobra o paga el saldo de una cuenta. Actualiza caja y marca la factura o recepción como pagada. */
function liquidarCuenta(cuentaId: string): Resultado {
  const cuenta = state.cuentas.find((c) => c.id === cuentaId);
  const esCobro = cuenta?.tipo === 'Cobrar';
  const M = 'Tesorería';
  if (!cuenta) return rechazar('Tesorería', 'Liquidar cuenta', 'La cuenta no existe.');
  if (cuenta.estado === 'Cancelada') return rechazar(M, 'Liquidar cuenta', 'La cuenta ya está cancelada.', cuenta.documentoNumero);
  // Cobrar o pagar mueve dinero real: la caja debe estar abierta y, para pagar, alcanzar.
  if (!sesionAbierta(state.sesionesCaja)) return rechazar(M, 'Liquidar cuenta', CAJA_CERRADA, cuenta.documentoNumero);
  if (!esCobro && cuenta.saldo > saldoDeCaja(state.caja)) {
    return rechazar(M, 'Liquidar cuenta',
      cajaInsuficiente(saldoDeCaja(state.caja), 'Registra primero un cobro o retira dinero del banco.'), cuenta.documentoNumero);
  }

  commit({
    ...state,
    cuentas: state.cuentas.map((c) => (c.id === cuentaId ? { ...c, saldo: 0, estado: 'Cancelada' } : c)),
    ventas: esCobro
      ? state.ventas.map((v) => (v.numero === cuenta.documentoNumero ? { ...v, estadoPago: 'Pagada' } : v))
      : state.ventas,
    compras: esCobro
      ? state.compras
      : state.compras.map((c) => (c.numero === cuenta.documentoNumero ? { ...c, estadoPago: 'Pagada' } : c)),
    caja: [...state.caja, {
      id: nuevoId('CAJ'), fecha: ahora(), tipo: esCobro ? 'Ingreso' : 'Egreso',
      concepto: `${esCobro ? 'Cobro' : 'Pago'} ${cuenta.documentoNumero}`,
      monto: cuenta.saldo, documentoNumero: cuenta.documentoNumero,
    }],
  }, { modulo: M, accion: esCobro ? 'Registrar cobro' : 'Registrar pago', registroId: cuenta.documentoNumero, resultado: 'Exitoso' });
  return { ok: true, id: cuentaId };
}

/* ───────── Tesorería: depósitos y retiros entre Caja y Banco ───────── */

export interface DatosMovimientoBanco {
  cuentaId: string; tipo: 'Depósito' | 'Retiro'; monto: number; concepto: string;
}

/** Un depósito saca dinero de Caja y lo lleva al banco; un retiro hace lo contrario. El total no cambia. */
function registrarMovimientoBanco(d: DatosMovimientoBanco): Resultado {
  const M = 'Tesorería';
  const A = d.tipo === 'Depósito' ? 'Depositar en banco' : 'Retirar del banco';
  const s = state;
  const cuenta = s.cuentasBancarias.find((c) => c.id === d.cuentaId && c.estado === 'Activo');
  if (!cuenta) return rechazar(M, A, 'Selecciona una cuenta bancaria activa.');
  if (!Number.isFinite(d.monto) || d.monto <= 0) return rechazar(M, A, 'El monto debe ser mayor que cero.');

  const monto = r2(d.monto);
  const saldoBanco = saldoCuenta(s.movimientosBanco, cuenta.id);
  const esDeposito = d.tipo === 'Depósito';
  if (esDeposito && monto > saldoDeCaja(s.caja)) {
    return rechazar(M, A, `Caja no tiene saldo suficiente. Disponible: S/ ${saldoDeCaja(s.caja).toFixed(2)}.`);
  }
  if (!esDeposito && monto > saldoBanco) {
    return rechazar(M, A, `La cuenta no tiene saldo suficiente. Disponible: S/ ${saldoBanco.toFixed(2)}.`);
  }
  // Depositar y retirar también mueven dinero de Caja: debe estar abierta.
  if (!sesionAbierta(s.sesionesCaja)) return rechazar(M, A, CAJA_CERRADA);

  const fecha = ahora();
  const numero = numerar('MB', s.movimientosBanco.length);
  const banco = s.bancos.find((b) => b.id === cuenta.bancoId)?.nombre ?? 'Banco';
  const referencia = `${banco} ...${cuenta.numero.slice(-4)}`;
  const id = nuevoId('MBN');
  const concepto = d.concepto.trim() || (esDeposito ? `Depósito a ${referencia}` : `Retiro de ${referencia}`);

  commit({
    ...s,
    movimientosBanco: [...s.movimientosBanco, {
      id, fecha, numero, cuentaId: cuenta.id, tipo: d.tipo, concepto, monto,
      saldo: r2(esDeposito ? saldoBanco + monto : saldoBanco - monto),
    }],
    caja: [...s.caja, {
      id: nuevoId('CAJ'), fecha, tipo: esDeposito ? 'Egreso' : 'Ingreso',
      concepto: `${esDeposito ? 'Depósito a' : 'Retiro de'} ${referencia}`, monto, documentoNumero: numero,
    }],
  }, { modulo: M, accion: A, registroId: numero, resultado: 'Exitoso', detalle: concepto });
  return { ok: true, id };
}

/* ───────── Tesorería: apertura y cierre de caja ───────── */

export interface DatosAperturaCaja { montoInicial: number }
export interface DatosCierreCaja { saldoContado: number }

/**
 * Abre la caja con el dinero contado. Si no coincide con el saldo que el sistema tiene,
 * la diferencia queda como un movimiento de apertura para que el libro cuadre con lo contado.
 */
function abrirCaja(d: DatosAperturaCaja): Resultado {
  const M = 'Tesorería', A = 'Abrir caja';
  const s = state;
  if (sesionAbierta(s.sesionesCaja)) return rechazar(M, A, 'Ya hay una caja abierta. Ciérrala antes de abrir otra.');
  if (!Number.isFinite(d.montoInicial) || d.montoInicial < 0) return rechazar(M, A, 'El monto inicial no puede ser negativo.');

  const fecha = ahora();
  const montoInicial = r2(d.montoInicial);
  const numero = numerar('CJ', s.sesionesCaja.length);
  const saldoLibro = saldoDeCaja(s.caja);
  const diferencia = r2(montoInicial - saldoLibro);
  const id = nuevoId('SCJ');

  const ajuste: MovimientoCaja[] = diferencia === 0 ? [] : [{
    id: nuevoId('CAJ'), fecha, tipo: diferencia > 0 ? 'Ingreso' : 'Egreso',
    concepto: diferencia < 0 ? `Faltante al abrir ${numero}` : saldoLibro === 0 ? `Fondo inicial ${numero}` : `Sobrante al abrir ${numero}`,
    monto: Math.abs(diferencia), documentoNumero: numero, origen: 'Apertura',
  }];

  commit({
    ...s,
    sesionesCaja: [...s.sesionesCaja, { id, numero, fechaApertura: fecha, montoInicial, estado: 'Abierta' }],
    caja: [...s.caja, ...ajuste],
  }, { modulo: M, accion: A, registroId: numero, resultado: 'Exitoso', detalle: `Monto inicial S/ ${montoInicial.toFixed(2)}` });
  return { ok: true, id };
}

/** Cierra la caja con un arqueo: compara el saldo esperado con el dinero contado y registra la diferencia. */
function cerrarCaja(d: DatosCierreCaja): Resultado {
  const M = 'Tesorería', A = 'Cerrar caja';
  const s = state;
  const sesion = sesionAbierta(s.sesionesCaja);
  if (!sesion) return rechazar(M, A, 'No hay una caja abierta.');
  if (!Number.isFinite(d.saldoContado) || d.saldoContado < 0) return rechazar(M, A, 'El monto contado no puede ser negativo.');

  const fecha = ahora();
  const saldoContado = r2(d.saldoContado);
  const saldoEsperado = saldoDeCaja(s.caja);
  const diferencia = r2(saldoContado - saldoEsperado);

  const ajuste: MovimientoCaja[] = diferencia === 0 ? [] : [{
    id: nuevoId('CAJ'), fecha, tipo: diferencia > 0 ? 'Ingreso' : 'Egreso',
    concepto: `${diferencia > 0 ? 'Sobrante' : 'Faltante'} de arqueo ${sesion.numero}`,
    monto: Math.abs(diferencia), documentoNumero: sesion.numero, origen: 'Arqueo',
  }];

  commit({
    ...s,
    sesionesCaja: s.sesionesCaja.map((x) => (x.id === sesion.id
      ? { ...x, estado: 'Cerrada', fechaCierre: fecha, saldoEsperado, saldoContado, diferencia }
      : x)),
    caja: [...s.caja, ...ajuste],
  }, {
    modulo: M, accion: A, registroId: sesion.numero, resultado: 'Exitoso',
    detalle: diferencia === 0 ? 'Sin diferencia' : `Diferencia S/ ${diferencia.toFixed(2)}`,
  });
  return { ok: true, id: sesion.id };
}

/* ───────── Documentos ───────── */

export interface DatosDocumento {
  nombre: string; tamanoKb: number; tipo: 'Contrato' | 'Otro';
  entidad: 'Venta' | 'Compra' | 'Otro'; entidadId: string;
}

export const EXTENSIONES_PERMITIDAS = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'xlsx'];
export const MAX_ARCHIVO_KB = 5120;
const esManual = (tipo: string): boolean => tipo === 'Contrato' || tipo === 'Otro';

function registrarDocumento(d: DatosDocumento): Resultado {
  const M = 'Documentos', A = 'Subir documento';
  const s = state;
  const nombre = d.nombre.trim();
  const ext = nombre.split('.').pop()?.toLowerCase() ?? '';
  if (nombre === '') return rechazar(M, A, 'Selecciona un archivo.');
  if (!EXTENSIONES_PERMITIDAS.includes(ext)) return rechazar(M, A, `Formato no permitido. Usa: ${EXTENSIONES_PERMITIDAS.join(', ')}.`);
  if (d.tamanoKb > MAX_ARCHIVO_KB) return rechazar(M, A, 'El archivo supera los 5 MB permitidos.');
  if (s.documentos.filter((x) => esManual(x.tipo)).length >= LIMITE_REGISTROS) {
    return rechazar(M, A, `Se alcanzó el límite de ${LIMITE_REGISTROS} registro en documentos subidos.`);
  }
  if (d.entidad === 'Venta' && !s.ventas.some((v) => v.id === d.entidadId)) return rechazar(M, A, 'La venta indicada no existe.');
  if (d.entidad === 'Compra' && !s.compras.some((c) => c.id === d.entidadId)) return rechazar(M, A, 'La compra indicada no existe.');

  const id = nuevoId('DOC');
  commit({
    ...s,
    documentos: [...s.documentos, {
      id, nombre, tipo: d.tipo, tamanoKb: d.tamanoKb, fecha: ahora(), entidad: d.entidad,
      entidadId: d.entidad === 'Otro' ? '' : d.entidadId,
      rutaS3: `${BUCKET_S3}/archivos/${nombre.replace(/[^\w.-]+/g, '_')}`,
    }],
  }, { modulo: M, accion: A, registroId: nombre, resultado: 'Exitoso' });
  return { ok: true, id };
}

function eliminarDocumento(id: string): Resultado {
  const M = 'Documentos', A = 'Eliminar documento';
  const doc = state.documentos.find((x) => x.id === id);
  if (!doc) return rechazar(M, A, 'El documento no existe.');
  if (!esManual(doc.tipo)) return rechazar(M, A, 'Los comprobantes y facturas los genera el sistema y no se eliminan.');
  commit({ ...state, documentos: state.documentos.filter((x) => x.id !== id) },
    { modulo: M, accion: A, registroId: doc.nombre, resultado: 'Exitoso' });
  return { ok: true, id };
}

/* ───────── Administración ───────── */

export const MODULOS_CON_PERMISO = [
  'mantenimiento', 'ventas', 'compras', 'inventario', 'tesoreria',
  'documentos', 'reportes', 'administracion', 'cloud',
];

/** Datos de la empresa emisora que se imprimen en los comprobantes. */
function actualizarEmpresa(d: Empresa): Resultado {
  const M = 'Administración', A = 'Editar datos de la empresa';
  const limpio: Empresa = {
    razonSocial: d.razonSocial.trim(), ruc: d.ruc.trim(), rubro: d.rubro.trim(),
    direccion: d.direccion.trim(), telefono: d.telefono.trim(), correo: d.correo.trim(),
  };
  if (!limpio.razonSocial || !limpio.direccion) return fallo('La razón social y la dirección son obligatorias.');
  if (!/^\d{11}$/.test(limpio.ruc)) return fallo('El RUC debe tener 11 dígitos.');
  commit({ ...state, empresa: limpio }, { modulo: M, accion: A, registroId: limpio.ruc, resultado: 'Exitoso' });
  return { ok: true, id: limpio.ruc };
}

/* ───────── Sesión (login simulado) ───────── */

/** Valida correo y clave. Un usuario Inactivo no puede entrar. Cada intento queda en la auditoría. */
function iniciarSesion(correo: string, clave: string): Resultado {
  const M = 'Sesión', A = 'Iniciar sesión';
  const email = correo.trim().toLowerCase();
  if (email === '' || clave === '') return fallo('Ingresa tu correo y tu contraseña.');
  const usuario = state.usuarios.find((u) => u.correo.toLowerCase() === email);
  if (!usuario || clave !== CLAVE_DEMO) return rechazar(M, A, 'Correo o contraseña incorrectos.', email);
  if (usuario.estado !== 'Activo') return rechazar(M, A, 'Tu usuario está inactivo. Pide al administrador que lo active.', email);
  sesion.abrir(usuario.id);
  commit(state, { modulo: M, accion: A, registroId: email, resultado: 'Exitoso' });
  return { ok: true, id: usuario.id };
}

function cerrarSesion(): Resultado {
  const id = sesion.getUsuarioId() ?? '-';
  commit(state, { modulo: 'Sesión', accion: 'Cerrar sesión', registroId: id, resultado: 'Exitoso' });
  sesion.cerrar();
  return { ok: true, id };
}

function actualizarPermisos(rolId: string, permisos: string[]): Resultado {
  const M = 'Administración', A = 'Cambiar permisos';
  const rol = state.roles.find((r) => r.id === rolId);
  if (!rol) return rechazar(M, A, 'El rol no existe.');
  if (permisos.some((p) => !MODULOS_CON_PERMISO.includes(p))) return rechazar(M, A, 'Hay un permiso que no corresponde a ningún módulo.');
  const usuario = state.usuarios.find((u) => u.id === sesion.getUsuarioId());
  if (usuario?.rolId === rolId && !permisos.includes('administracion')) {
    return rechazar(M, A, 'No puedes quitar el acceso a Administración al rol de la sesión actual.');
  }
  commit({ ...state, roles: state.roles.map((r) => (r.id === rolId ? { ...r, permisos } : r)) },
    { modulo: M, accion: A, registroId: rol.nombre, resultado: 'Exitoso', detalle: `${permisos.length} módulos permitidos` });
  return { ok: true, id: rolId };
}

/* ───────── API pública ───────── */

function restablecer(): Resultado {
  const inicial = estadoInicial();
  commit(inicial, { modulo: 'Administración', accion: 'Restablecer datos de demostración', registroId: '-', resultado: 'Exitoso' });
  // Si quien restableció era un usuario creado después, ya no existe: se cierra su sesión.
  if (!inicial.usuarios.some((u) => u.id === sesion.getUsuarioId())) sesion.cerrar();
  return { ok: true, id: '-' };
}

export const erpStore = {
  getState: (): ErpState => state,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  acciones: {
    crearMaestro, actualizarMaestro, eliminarMaestro,
    registrarCotizacion, aceptarCotizacion, registrarOrdenVenta, facturarOrdenVenta,
    registrarOrdenCompra, recibirOrdenCompra, registrarAjuste, liquidarCuenta, registrarMovimientoBanco,
    abrirCaja, cerrarCaja, registrarDocumento, eliminarDocumento, actualizarPermisos, restablecer,
    iniciarSesion, cerrarSesion,
    anularCotizacion, anularOrdenVenta, anularOrdenCompra, actualizarEmpresa,
  },
};
