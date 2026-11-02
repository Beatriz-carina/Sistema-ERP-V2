import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useErp } from '../../../core/hooks/useErp';
import { api } from '../../../core/services/api';
import { ruta } from '../../../core/config/navigation';
import { faltantesDocumento, filasOrdenesVenta } from '../../../core/utils/filas';
import { AvisoFlujo, type Aviso } from '../../../core/components/AvisoFlujo';
import { Modal } from '../../../core/components/Modal';
import { FormularioOperacion } from '../../../core/components/operaciones/FormularioOperacion';
import { ListaDocumentos } from '../../../core/components/operaciones/ListaDocumentos';
import { ModalAnular } from '../../../core/components/operaciones/ModalAnular';
import type { FilaDocumento } from '../../../core/utils/filas';

export const OrdenesVentaPage: React.FC = () => {
  const { state } = useErp();
  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [anulando, setAnulando] = useState<FilaDocumento | null>(null);

  return (
    <div className="space-y-4">
      {aviso && <AvisoFlujo aviso={aviso} onCerrar={() => setAviso(null)} />}

      <ListaDocumentos
        documento={{ articulo: 'una', singular: 'orden de venta', plural: 'órdenes de venta', tituloDetalle: 'Orden de venta' }}
        etiquetaTercero="Cliente"
        etiquetaEstado="Estado"
        filas={filasOrdenesVenta(state)}
        estadosPendientes={['Pendiente']}
        etiquetaPendientes="Por facturar"
        nuevo={{ texto: 'Nueva orden de venta', onClick: () => { setAviso(null); setCreando(true); }, faltantes: faltantesDocumento(state, 'venta') }}
        accionFila={(f) => f.estado === 'Pendiente' ? (
          <div className="flex justify-end gap-1">
            <Link to={ruta('ventas', 'facturacion')}
              className="px-3 py-1.5 rounded-lg text-sm text-teal-700 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              Ir a facturar
            </Link>
            <button onClick={() => { setAviso(null); setAnulando(f); }}
              className="px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
              Anular
            </button>
          </div>
        ) : null}
        vacio="Registra una orden de venta, o acepta una cotización para generarla."
      />

      {creando && (
        <Modal titulo="Nueva orden de venta" onCerrar={() => setCreando(false)}>
          <FormularioOperacion
            modo="orden-venta"
            state={state}
            onGuardar={(d) => api.ventas.registrarOrden({ clienteId: d.terceroId, vendedorId: d.vendedorId, almacenId: d.almacenId, condicion: d.condicion, detalle: d.detalle })}
            onExito={() => {
              setCreando(false);
              setAviso({ ok: true, texto: 'Orden de venta registrada. Siguiente paso: emitir su factura.', siguiente: { to: ruta('ventas', 'facturacion'), texto: 'Ir a Facturación' } });
            }}
            onCancelar={() => setCreando(false)}
          />
        </Modal>
      )}

      {anulando && (
        <ModalAnular
          documento={`orden de venta ${anulando.numero}`}
          onAnular={(motivo) => api.ventas.anularOrden(anulando.id, motivo)}
          onExito={() => { setAviso({ ok: true, texto: `Orden de venta ${anulando.numero} anulada.` }); setAnulando(null); }}
          onCerrar={() => setAnulando(null)}
        />
      )}
    </div>
  );
};
