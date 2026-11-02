import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useErp } from '../../../core/hooks/useErp';
import { useAccion } from '../../../core/hooks/useAccion';
import { api } from '../../../core/services/api';
import { ruta } from '../../../core/config/navigation';
import { filasFacturas, filasOrdenesVenta } from '../../../core/utils/filas';
import { formatFecha, formatMoneda } from '../../../core/utils/format';
import { AvisoFlujo, type Aviso } from '../../../core/components/AvisoFlujo';
import { DataTable, type ColumnaTabla } from '../../../core/components/DataTable';
import { Insignia } from '../../../core/components/Insignia';
import { ListaDocumentos } from '../../../core/components/operaciones/ListaDocumentos';
import type { FilaDocumento } from '../../../core/utils/filas';

export const FacturacionPage: React.FC = () => {
  const { state } = useErp();
  const { enviando, ejecutar } = useAccion();
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const navigate = useNavigate();
  const porFacturar = filasOrdenesVenta(state).filter((o) => o.estado === 'Pendiente');

  const facturar = async (f: FilaDocumento) => {
    const r = await ejecutar(() => api.ventas.facturar(f.id));
    if (r.ok) {
      // Al emitir se abre el comprobante (representación impresa simulada), listo para imprimir.
      navigate(ruta('ventas', `comprobante/${r.id}`));
    } else {
      setAviso({
        ok: false,
        texto: r.error,
        siguiente: /Stock insuficiente/.test(r.error) ? { to: ruta('compras', 'ordenes'), texto: 'Ir a Compras' } : undefined,
      });
    }
  };

  const columnas: ColumnaTabla<FilaDocumento>[] = [
    { titulo: 'Orden', celda: (f) => f.numero },
    { titulo: 'Fecha', celda: (f) => formatFecha(f.fecha) },
    { titulo: 'Cliente', celda: (f) => f.tercero },
    { titulo: 'Condición', celda: (f) => <Insignia texto={f.condicion} /> },
    { titulo: 'Total', celda: (f) => formatMoneda(f.total), derecha: true },
  ];

  return (
    <div className="space-y-6">
      {aviso && <AvisoFlujo aviso={aviso} onCerrar={() => setAviso(null)} />}

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Órdenes pendientes de facturar</h2>
        {porFacturar.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay órdenes esperando factura. Se generan en{' '}
            <Link to={ruta('ventas', 'ordenes')} className="text-teal-700 underline">Órdenes de venta</Link>.
          </p>
        ) : (
          <DataTable
            columnas={columnas}
            filas={porFacturar}
            clave={(f) => f.id}
            vacio={null}
            acciones={(f) => (
              <button onClick={() => { setAviso(null); facturar(f); }} disabled={enviando}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
                {enviando ? 'Emitiendo…' : 'Emitir factura'}
              </button>
            )}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Facturas emitidas</h2>
        <ListaDocumentos
          documento={{ articulo: 'una', singular: 'factura', plural: 'facturas', tituloDetalle: 'Factura' }}
          etiquetaTercero="Cliente"
          etiquetaEstado="Estado de pago"
          filas={filasFacturas(state)}
          estadosPendientes={['Pendiente']}
          etiquetaPendientes="Por cobrar"
          accionFila={(f) => (
            <Link to={ruta('ventas', `comprobante/${f.id}`)}
              className="px-3 py-1.5 rounded-lg text-sm text-teal-700 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              Ver factura
            </Link>
          )}
          vacio="Aún no se emitió ninguna factura en este período."
        />
      </section>
    </div>
  );
};
