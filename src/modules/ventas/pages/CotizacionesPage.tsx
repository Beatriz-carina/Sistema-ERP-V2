import { useState } from 'react';
import { useErp } from '../../../core/hooks/useErp';
import { useAccion } from '../../../core/hooks/useAccion';
import { api } from '../../../core/services/api';
import { ruta } from '../../../core/config/navigation';
import { faltantesDocumento, filasCotizaciones } from '../../../core/utils/filas';
import { AvisoFlujo, type Aviso } from '../../../core/components/AvisoFlujo';
import { Modal } from '../../../core/components/Modal';
import { FormularioOperacion } from '../../../core/components/operaciones/FormularioOperacion';
import { ListaDocumentos } from '../../../core/components/operaciones/ListaDocumentos';
import { ModalAnular } from '../../../core/components/operaciones/ModalAnular';
import type { FilaDocumento } from '../../../core/utils/filas';

export const CotizacionesPage: React.FC = () => {
  const { state } = useErp();
  const { enviando, ejecutar } = useAccion();
  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [anulando, setAnulando] = useState<FilaDocumento | null>(null);

  const aceptar = async (id: string) => {
    const r = await ejecutar(() => api.ventas.aceptarCotizacion(id));
    setAviso(r.ok
      ? { ok: true, texto: 'Cotización aceptada. Se generó la orden de venta.', siguiente: { to: ruta('ventas', 'ordenes'), texto: 'Ir a Órdenes de venta' } }
      : { ok: false, texto: r.error });
  };

  return (
    <div className="space-y-4">
      {aviso && <AvisoFlujo aviso={aviso} onCerrar={() => setAviso(null)} />}

      <ListaDocumentos
        documento={{ articulo: 'una', singular: 'cotización', plural: 'cotizaciones', tituloDetalle: 'Cotización' }}
        etiquetaTercero="Cliente"
        etiquetaEstado="Estado"
        filas={filasCotizaciones(state)}
        estadosPendientes={['Pendiente']}
        etiquetaPendientes="Por aceptar"
        nuevo={{ texto: 'Nueva cotización', onClick: () => { setAviso(null); setCreando(true); }, faltantes: faltantesDocumento(state, 'venta') }}
        accionFila={(f) => f.estado === 'Pendiente' ? (
          <div className="flex justify-end gap-1">
            <button onClick={() => aceptar(f.id)} disabled={enviando}
              className="px-3 py-1.5 rounded-lg text-sm text-teal-700 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              {enviando ? 'Procesando…' : 'Aceptar y generar orden'}
            </button>
            <button onClick={() => { setAviso(null); setAnulando(f); }}
              className="px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
              Anular
            </button>
          </div>
        ) : null}
        vacio="Registra una cotización o amplía el rango de fechas."
      />

      {creando && (
        <Modal titulo="Nueva cotización" onCerrar={() => setCreando(false)}>
          <FormularioOperacion
            modo="cotizacion"
            state={state}
            onGuardar={(d) => api.ventas.registrarCotizacion({ clienteId: d.terceroId, vendedorId: d.vendedorId, almacenId: d.almacenId, condicion: d.condicion, detalle: d.detalle })}
            onExito={() => { setCreando(false); setAviso({ ok: true, texto: 'Cotización registrada. Siguiente paso: aceptarla para generar la orden de venta.' }); }}
            onCancelar={() => setCreando(false)}
          />
        </Modal>
      )}

      {anulando && (
        <ModalAnular
          documento={`cotización ${anulando.numero}`}
          onAnular={(motivo) => api.ventas.anularCotizacion(anulando.id, motivo)}
          onExito={() => { setAviso({ ok: true, texto: `Cotización ${anulando.numero} anulada.` }); setAnulando(null); }}
          onCerrar={() => setAnulando(null)}
        />
      )}
    </div>
  );
};
