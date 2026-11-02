/**
 * Capa de servicios: la ÚNICA puerta por la que las pantallas guardan algo.
 *
 * Cada operación tiene la ruta REST que tendrá en el backend FastAPI (documento maestro, punto 15).
 * - Modo "mock" (hoy): ejecuta la regla de negocio en erpStore, en el navegador, con una pequeña demora
 *   para que la interfaz se comporte como con un servidor real.
 * - Modo "http" (cuando exista el backend): las mismas funciones harán fetch a esas rutas. Las pantallas no cambian.
 *
 * Todos los módulos siguen escribiendo en un solo almacén de datos (hoy erpStore, mañana PostgreSQL):
 * por eso una factura sigue descontando stock, abriendo la cuenta por cobrar y archivando el comprobante a la vez.
 */
import { erpStore } from './erpStore';
import type { ColeccionMaestra, Resultado } from '../types';

export const API_MODE: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock';
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/** Demora simulada del modo mock (ms). Permite ver el estado "Guardando…" como en producción. */
const DEMORA_MOCK = 250;

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

/**
 * Envuelve una acción del negocio como una llamada a la API.
 * `ruta` documenta el endpoint del backend que la reemplazará.
 */
function endpoint<A extends unknown[]>(ruta: string, accion: (...args: A) => Resultado) {
  return async (...args: A): Promise<Resultado> => {
    if (API_MODE === 'http') {
      return { ok: false, error: `El backend aún no está conectado (${ruta}). Usa VITE_API_MODE=mock.` };
    }
    await esperar(DEMORA_MOCK);
    try {
      return accion(...args);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Ocurrió un error inesperado.' };
    }
  };
}

const a = erpStore.acciones;

export const api = {
  auth: {
    login: endpoint('POST /api/v1/auth/login', a.iniciarSesion),
    logout: endpoint('POST /api/v1/auth/logout', a.cerrarSesion),
  },
  /** Clientes, proveedores, productos, almacenes, usuarios… (customers, suppliers, products, users) */
  maestros: {
    crear: endpoint('POST /api/v1/{coleccion}', a.crearMaestro as (col: ColeccionMaestra, datos: never) => Resultado),
    actualizar: endpoint('PUT /api/v1/{coleccion}/{id}', a.actualizarMaestro as (col: ColeccionMaestra, id: string, datos: never) => Resultado),
    eliminar: endpoint('DELETE /api/v1/{coleccion}/{id}', a.eliminarMaestro),
  },
  ventas: {
    registrarCotizacion: endpoint('POST /api/v1/sales/quotes', a.registrarCotizacion),
    aceptarCotizacion: endpoint('POST /api/v1/sales/quotes/{id}/accept', a.aceptarCotizacion),
    registrarOrden: endpoint('POST /api/v1/sales/orders', a.registrarOrdenVenta),
    facturar: endpoint('POST /api/v1/sales/orders/{id}/invoice', a.facturarOrdenVenta),
    anularCotizacion: endpoint('POST /api/v1/sales/quotes/{id}/cancel', a.anularCotizacion),
    anularOrden: endpoint('POST /api/v1/sales/orders/{id}/cancel', a.anularOrdenVenta),
  },
  compras: {
    registrarOrden: endpoint('POST /api/v1/purchases/orders', a.registrarOrdenCompra),
    recibir: endpoint('POST /api/v1/purchases/orders/{id}/receive', a.recibirOrdenCompra),
    anularOrden: endpoint('POST /api/v1/purchases/orders/{id}/cancel', a.anularOrdenCompra),
  },
  inventario: {
    registrarAjuste: endpoint('POST /api/v1/inventory/adjustments', a.registrarAjuste),
  },
  tesoreria: {
    abrirCaja: endpoint('POST /api/v1/treasury/cash/open', a.abrirCaja),
    cerrarCaja: endpoint('POST /api/v1/treasury/cash/close', a.cerrarCaja),
    movimientoBanco: endpoint('POST /api/v1/treasury/bank-movements', a.registrarMovimientoBanco),
    /** Cobro de una cuenta por cobrar o pago de una cuenta por pagar. */
    liquidarCuenta: endpoint('POST /api/v1/payments', a.liquidarCuenta),
  },
  documentos: {
    registrar: endpoint('POST /api/v1/documents', a.registrarDocumento),
    eliminar: endpoint('DELETE /api/v1/documents/{id}', a.eliminarDocumento),
  },
  administracion: {
    actualizarPermisos: endpoint('PUT /api/v1/roles/{id}/permissions', a.actualizarPermisos),
    restablecer: endpoint('POST /api/v1/admin/reset', a.restablecer),
    actualizarEmpresa: endpoint('PUT /api/v1/company', a.actualizarEmpresa),
  },
};
