export type Estado = 'Activo' | 'Inactivo';
export type CondicionPago = 'Contado' | 'Crédito';

/* ───────── Mantenimiento (datos maestros) ───────── */

/** Catálogo simple: categorías, marcas, unidades y monedas. */
export interface Maestro {
  id: string;
  nombre: string;
  estado: Estado;
}

export interface Cliente {
  id: string;
  tipoDocumento: 'RUC' | 'DNI';
  numeroDocumento: string;
  razonSocial: string;
  correo: string;
  telefono: string;
  direccion: string;
  limiteCredito: number;
  estado: Estado;
}

export interface Proveedor {
  id: string;
  ruc: string;
  razonSocial: string;
  contacto: string;
  correo: string;
  telefono: string;
  direccion: string;
  estado: Estado;
}

export interface Almacen {
  id: string;
  nombre: string;
  direccion: string;
  estado: Estado;
}

export interface Vendedor {
  id: string;
  nombre: string;
  documento: string;
  cargo: string;
  estado: Estado;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoriaId: string;
  marcaId: string;
  unidadId: string;
  monedaId: string;
  precioCompra: number;
  precioVenta: number;
  stockMinimo: number;
  /** Meses de garantía que se imprimen en el comprobante (0 = sin garantía). */
  garantiaMeses?: number;
  estado: Estado;
}

/** Empresa que emite los comprobantes. Se edita en Administración › Parámetros. */
export interface Empresa {
  razonSocial: string;
  ruc: string;
  rubro: string;
  direccion: string;
  telefono: string;
  correo: string;
}

/* ───────── Operaciones ───────── */

export interface LineaDetalle {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: string;
  numero: string;
  fecha: string;
  clienteId: string;
  vendedorId: string;
  almacenId: string;
  condicion: CondicionPago;
  detalle: LineaDetalle[];
  subtotal: number;
  igv: number;
  total: number;
  estado: 'Emitida' | 'Anulada';
  comprobanteId: string;
  /** Orden de venta de la que nació esta factura. */
  ordenId: string;
  /** Se sincroniza con el estado de cuenta: pasa a Pagada al cobrarse. */
  estadoPago: 'Pendiente' | 'Pagada';
}

export interface Compra {
  id: string;
  numero: string;
  fecha: string;
  proveedorId: string;
  almacenId: string;
  condicion: CondicionPago;
  detalle: LineaDetalle[];
  subtotal: number;
  igv: number;
  total: number;
  estado: 'Recibida' | 'Anulada';
  facturaId: string;
  /** Orden de compra que se recibió en Kardex. */
  ordenId: string;
  /** Se sincroniza con el estado de cuenta: pasa a Pagada al pagarse. */
  estadoPago: 'Pendiente' | 'Pagada';
}

/* ───────── Documentos previos al comprobante ───────── */

/** Quién anuló un documento pendiente, cuándo y por qué. El documento no se borra: queda con estado Anulada. */
export interface Anulacion {
  fecha: string;
  usuario: string;
  motivo: string;
}

export interface Cotizacion {
  id: string;
  numero: string;
  fecha: string;
  clienteId: string;
  vendedorId: string;
  almacenId: string;
  condicion: CondicionPago;
  detalle: LineaDetalle[];
  subtotal: number;
  igv: number;
  total: number;
  estado: 'Pendiente' | 'Aceptada' | 'Anulada';
  ordenId: string;
  anulacion?: Anulacion;
}

export interface OrdenVenta {
  id: string;
  numero: string;
  fecha: string;
  cotizacionId: string;
  clienteId: string;
  vendedorId: string;
  almacenId: string;
  condicion: CondicionPago;
  detalle: LineaDetalle[];
  subtotal: number;
  igv: number;
  total: number;
  estado: 'Pendiente' | 'Facturada' | 'Anulada';
  ventaId: string;
  anulacion?: Anulacion;
}

export interface OrdenCompra {
  id: string;
  numero: string;
  fecha: string;
  proveedorId: string;
  almacenId: string;
  condicion: CondicionPago;
  detalle: LineaDetalle[];
  subtotal: number;
  igv: number;
  total: number;
  estado: 'Pendiente' | 'Recibida' | 'Anulada';
  compraId: string;
  anulacion?: Anulacion;
}

/* ───────── Inventario ───────── */

export interface MovimientoInventario {
  id: string;
  fecha: string;
  tipo: 'Entrada' | 'Salida';
  origen: 'Compra' | 'Venta' | 'Ajuste';
  documentoNumero: string;
  productoId: string;
  almacenId: string;
  cantidad: number;
  saldo: number;
  motivo?: string;
}

/* ───────── Tesorería ───────── */

export interface CuentaFinanciera {
  id: string;
  tipo: 'Cobrar' | 'Pagar';
  documentoNumero: string;
  terceroId: string;
  monto: number;
  saldo: number;
  vencimiento: string;
  estado: 'Pendiente' | 'Cancelada';
}

export interface MovimientoCaja {
  id: string;
  fecha: string;
  tipo: 'Ingreso' | 'Egreso';
  concepto: string;
  monto: number;
  documentoNumero: string;
  /** Solo lo traen los asientos de apertura y de arqueo; los movimientos operativos no lo llevan. */
  origen?: 'Apertura' | 'Arqueo';
}

/** Una apertura y su cierre. Mientras haya una Abierta, la caja puede recibir y entregar dinero. */
export interface SesionCaja {
  id: string;
  /** Número de la sesión, por ejemplo CJ-0001. */
  numero: string;
  fechaApertura: string;
  /** Dinero contado al abrir. */
  montoInicial: number;
  estado: 'Abierta' | 'Cerrada';
  fechaCierre?: string;
  /** Saldo que el sistema esperaba al cerrar. */
  saldoEsperado?: number;
  /** Dinero contado al cerrar (arqueo). */
  saldoContado?: number;
  /** Contado menos esperado: positivo es sobrante, negativo es faltante. */
  diferencia?: number;
}

/* ───────── Bancos ───────── */

export interface CuentaBancaria {
  id: string;
  bancoId: string;
  numero: string;
  tipo: 'Corriente' | 'Ahorros';
  estado: Estado;
}

export interface MovimientoBanco {
  id: string;
  fecha: string;
  /** Número del movimiento, por ejemplo MB-0001. */
  numero: string;
  cuentaId: string;
  tipo: 'Depósito' | 'Retiro';
  concepto: string;
  monto: number;
  /** Saldo de la cuenta después de este movimiento. */
  saldo: number;
}

/* ───────── Documentos ───────── */

export interface Documento {
  id: string;
  nombre: string;
  tipo: 'Comprobante de venta' | 'Factura de proveedor' | 'Contrato' | 'Otro';
  tamanoKb: number;
  fecha: string;
  entidad: 'Venta' | 'Compra' | 'Otro';
  entidadId: string;
  /** Ruta simulada del objeto en Amazon S3. */
  rutaS3: string;
}

/* ───────── Administración ───────── */

export interface Rol {
  id: string;
  nombre: string;
  permisos: string[];
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rolId: string;
  estado: Estado;
}

export interface Auditoria {
  id: string;
  fecha: string;
  usuario: string;
  modulo: string;
  accion: string;
  registroId: string;
  resultado: 'Exitoso' | 'Rechazado';
  detalle?: string;
}

/* ───────── Estado global del ERP ───────── */

export interface ErpState {
  empresa: Empresa;
  clientes: Cliente[];
  proveedores: Proveedor[];
  productos: Producto[];
  almacenes: Almacen[];
  vendedores: Vendedor[];
  categorias: Maestro[];
  marcas: Maestro[];
  unidades: Maestro[];
  monedas: Maestro[];
  ventas: Venta[];
  compras: Compra[];
  cotizaciones: Cotizacion[];
  ordenesVenta: OrdenVenta[];
  ordenesCompra: OrdenCompra[];
  movimientos: MovimientoInventario[];
  cuentas: CuentaFinanciera[];
  caja: MovimientoCaja[];
  sesionesCaja: SesionCaja[];
  bancos: Maestro[];
  cuentasBancarias: CuentaBancaria[];
  movimientosBanco: MovimientoBanco[];
  documentos: Documento[];
  roles: Rol[];
  usuarios: Usuario[];
  auditoria: Auditoria[];
}

export type ColeccionMaestra =
  | 'clientes' | 'proveedores' | 'productos' | 'almacenes' | 'vendedores'
  | 'categorias' | 'marcas' | 'unidades' | 'monedas' | 'usuarios' | 'bancos' | 'cuentasBancarias';

export type Resultado = { ok: true; id: string } | { ok: false; error: string };
