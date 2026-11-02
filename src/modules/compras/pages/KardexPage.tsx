import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useErp } from '../../../core/hooks/useErp';
import { useAccion } from '../../../core/hooks/useAccion';
import { api } from '../../../core/services/api';
import { ruta } from '../../../core/config/navigation';
import { filasOrdenesCompra, filasRecepciones, type FilaDocumento } from '../../../core/utils/filas';
import { formatFecha, formatMoneda } from '../../../core/utils/format';
import { AvisoFlujo, type Aviso } from '../../../core/components/AvisoFlujo';
import { DataTable, type ColumnaTabla } from '../../../core/components/DataTable';
import { Insignia } from '../../../core/components/Insignia';
import { Modal } from '../../../core/components/Modal';
import { ListaDocumentos } from '../../../core/components/operaciones/ListaDocumentos';

export const KardexPage: React.FC = () => {
  const { state } = useErp();
  const { enviando, ejecutar } = useAccion();
  const [verificando, setVerificando] = useState<FilaDocumento | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const porRecibir = filasOrdenesCompra(state).filter((o) => o.estado === 'Pendiente');
  const producto = (id: string) => state.productos.find((p) => p.id === id)?.nombre ?? '-';

  const recibir = async () => {
    if (!verificando) return;
    const f = verificando;
    const r = await ejecutar(() => api.compras.recibir(f.id));
    setAviso(r.ok
      ? {
          ok: true,
          texto: f.condicion === 'Contado'
            ? 'Recepción guardada. Entró el stock, la factura quedó archivada y se pagó al contado.'
            : 'Recepción guardada. Entró el stock y la factura quedó archivada. Falta pagarla en Tesorería > Por pagar.',
          siguiente: f.condicion === 'Contado'
            ? { to: ruta('tesoreria', 'caja'), texto: 'Ver en Caja' }
            : { to: ruta('tesoreria', 'por-pagar'), texto: 'Ir a Por pagar' },
        }
      : { ok: false, texto: r.error });
    setVerificando(null);
  };

  const columnas: ColumnaTabla<FilaDocumento>[] = [
    { titulo: 'Orden', celda: (f) => f.numero },
    { titulo: 'Fecha', celda: (f) => formatFecha(f.fecha) },
    { titulo: 'Proveedor', celda: (f) => f.tercero },
    { titulo: 'Condición', celda: (f) => <Insignia texto={f.condicion} /> },
    { titulo: 'Total', celda: (f) => formatMoneda(f.total), derecha: true },
  ];

  return (
    <div className="space-y-6">
      {aviso && <AvisoFlujo aviso={aviso} onCerrar={() => setAviso(null)} />}

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Órdenes pendientes de recibir</h2>
        {porRecibir.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay órdenes esperando recepción. Se registran en{' '}
            <Link to={ruta('compras', 'ordenes')} className="text-teal-700 underline">Órdenes de compra</Link>.
          </p>
        ) : (
          <DataTable
            columnas={columnas}
            filas={porRecibir}
            clave={(f) => f.id}
            vacio={null}
            acciones={(f) => (
              <button onClick={() => { setAviso(null); setVerificando(f); }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
                Verificar y recibir
              </button>
            )}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Recepciones guardadas</h2>
        <ListaDocumentos
          documento={{ articulo: 'una', singular: 'recepción', plural: 'recepciones', tituloDetalle: 'Recepción' }}
          etiquetaTercero="Proveedor"
          etiquetaEstado="Estado de pago"
          filas={filasRecepciones(state)}
          estadosPendientes={['Pendiente']}
          etiquetaPendientes="Por pagar"
          vacio="Aún no se recibió ninguna orden en este período."
        />
      </section>

      {verificando && (
        <Modal titulo={`Verificar ${verificando.numero}`} onCerrar={() => setVerificando(null)}>
          <p className="text-sm text-slate-600">
            Confirma que lo recibido coincide con la orden. Al guardar, esta cantidad entra al stock del almacén.
          </p>
          <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-2 text-left font-medium">Producto</th>
                  <th className="px-4 py-2 text-right font-medium">Cantidad a ingresar</th>
                </tr>
              </thead>
              <tbody>
                {verificando.detalle.map((l) => (
                  <tr key={l.productoId} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 text-slate-700">{producto(l.productoId)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{l.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setVerificando(null)}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              Cancelar
            </button>
            <button onClick={recibir} disabled={enviando}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
              {enviando ? 'Guardando…' : 'Guardar recepción'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
