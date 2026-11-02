import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useErp } from '../../../core/hooks/useErp';
import { api } from '../../../core/services/api';
import { ruta } from '../../../core/config/navigation';
import { faltantesDocumento, filasOrdenesCompra } from '../../../core/utils/filas';
import { AvisoFlujo, type Aviso } from '../../../core/components/AvisoFlujo';
import { Modal } from '../../../core/components/Modal';
import { FormularioOperacion } from '../../../core/components/operaciones/FormularioOperacion';
import { ListaDocumentos } from '../../../core/components/operaciones/ListaDocumentos';
import { ModalAnular } from '../../../core/components/operaciones/ModalAnular';
import type { FilaDocumento } from '../../../core/utils/filas';

export const OrdenesCompraPage: React.FC = () => {
  const { state } = useErp();
  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [anulando, setAnulando] = useState<FilaDocumento | null>(null);

  return (
    <div className="space-y-4">
      {aviso && <AvisoFlujo aviso={aviso} onCerrar={() => setAviso(null)} />}

      <ListaDocumentos
        documento={{ articulo: 'una', singular: 'orden de compra', plural: 'órdenes de compra', tituloDetalle: 'Orden de compra' }}
        etiquetaTercero="Proveedor"
        etiquetaEstado="Estado"
        filas={filasOrdenesCompra(state)}
        estadosPendientes={['Pendiente']}
        etiquetaPendientes="Por recibir"
        nuevo={{ texto: 'Nueva orden de compra', onClick: () => { setAviso(null); setCreando(true); }, faltantes: faltantesDocumento(state, 'compra') }}
        accionFila={(f) => f.estado === 'Pendiente' ? (
          <div className="flex justify-end gap-1">
            <Link to={ruta('compras', 'kardex')}
              className="px-3 py-1.5 rounded-lg text-sm text-teal-700 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              Ir a Kardex
            </Link>
            <button onClick={() => { setAviso(null); setAnulando(f); }}
              className="px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
              Anular
            </button>
          </div>
        ) : null}
        vacio="Registra una orden de compra o amplía el rango de fechas."
      />

      {creando && (
        <Modal titulo="Nueva orden de compra" onCerrar={() => setCreando(false)}>
          <FormularioOperacion
            modo="orden-compra"
            state={state}
            onGuardar={(d) => api.compras.registrarOrden({ proveedorId: d.terceroId, almacenId: d.almacenId, condicion: d.condicion, detalle: d.detalle })}
            onExito={() => {
              setCreando(false);
              setAviso({ ok: true, texto: 'Orden de compra registrada. Siguiente paso: recibirla en Kardex cuando llegue la mercadería.', siguiente: { to: ruta('compras', 'kardex'), texto: 'Ir a Kardex' } });
            }}
            onCancelar={() => setCreando(false)}
          />
        </Modal>
      )}

      {anulando && (
        <ModalAnular
          documento={`orden de compra ${anulando.numero}`}
          onAnular={(motivo) => api.compras.anularOrden(anulando.id, motivo)}
          onExito={() => { setAviso({ ok: true, texto: `Orden de compra ${anulando.numero} anulada.` }); setAnulando(null); }}
          onCerrar={() => setAnulando(null)}
        />
      )}
    </div>
  );
};
