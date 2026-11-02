import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useErp } from '../../../core/hooks/useErp';
import { usePermisos } from '../../../core/hooks/usePermisos';
import { api } from '../../../core/services/api';
import { ROL_APROBADOR } from '../../../core/services/erpStore';
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
  const { rol } = usePermisos();
  const esGerente = rol?.nombre === ROL_APROBADOR;
  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [anulando, setAnulando] = useState<FilaDocumento | null>(null);
  const [rechazando, setRechazando] = useState<FilaDocumento | null>(null);

  const aprobar = async (f: FilaDocumento) => {
    setAviso(null);
    const r = await api.compras.aprobarOrden(f.id);
    setAviso(r.ok
      ? { ok: true, texto: `Orden ${f.numero} aprobada: la autorización quedó archivada en Documentos. Ya se puede recibir en Kardex.`, siguiente: { to: ruta('compras', 'kardex'), texto: 'Ir a Kardex' } }
      : { ok: false, texto: r.error });
  };

  return (
    <div className="space-y-4">
      {aviso && <AvisoFlujo aviso={aviso} onCerrar={() => setAviso(null)} />}

      <ListaDocumentos
        documento={{ articulo: 'una', singular: 'orden de compra', plural: 'órdenes de compra', tituloDetalle: 'Orden de compra' }}
        etiquetaTercero="Proveedor"
        etiquetaEstado="Estado"
        filas={filasOrdenesCompra(state)}
        estadosPendientes={['Por aprobar', 'Pendiente']}
        etiquetaPendientes="Por aprobar o recibir"
        nuevo={{ texto: 'Nueva orden de compra', onClick: () => { setAviso(null); setCreando(true); }, faltantes: faltantesDocumento(state, 'compra') }}
        accionFila={(f) => f.estado === 'Por aprobar' ? (
          <div className="flex justify-end items-center gap-1">
            {esGerente ? (
              <>
                <button onClick={() => aprobar(f)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
                  Aprobar
                </button>
                <button onClick={() => { setAviso(null); setRechazando(f); }}
                  className="px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                  Rechazar
                </button>
              </>
            ) : (
              <span className="text-xs text-slate-500 px-2">Esperando al gerente</span>
            )}
            <button onClick={() => { setAviso(null); setAnulando(f); }}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              Anular
            </button>
          </div>
        ) : f.estado === 'Pendiente' ? (
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
              setAviso({ ok: true, texto: 'Orden de compra registrada. Siguiente paso: el gerente (Administrador) debe aprobarla; después se recibe en Kardex.' });
            }}
            onCancelar={() => setCreando(false)}
          />
        </Modal>
      )}

      {rechazando && (
        <ModalAnular
          accion="Rechazar"
          documento={`orden de compra ${rechazando.numero}`}
          onAnular={(motivo) => api.compras.rechazarOrden(rechazando.id, motivo)}
          onExito={() => { setAviso({ ok: true, texto: `Orden de compra ${rechazando.numero} rechazada.` }); setRechazando(null); }}
          onCerrar={() => setRechazando(null)}
        />
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
