import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useErp } from '../../../core/hooks/useErp';
import { useAccion } from '../../../core/hooks/useAccion';
import { api } from '../../../core/services/api';
import { LIMITE_REGISTROS } from '../../../core/services/erpStore';
import { ruta } from '../../../core/config/navigation';
import { formatFechaHora } from '../../../core/utils/format';
import { DataTable, type ColumnaTabla } from '../../../core/components/DataTable';
import { EmptyState } from '../../../core/components/EmptyState';
import { Insignia } from '../../../core/components/Insignia';
import { Modal } from '../../../core/components/Modal';
import type { Documento } from '../../../core/types';
import { FormularioDocumento } from '../components/FormularioDocumento';

const esManual = (d: Documento): boolean => d.tipo === 'Contrato' || d.tipo === 'Otro';

export const DocumentosPage: React.FC = () => {
  const { state } = useErp();
  const { enviando, ejecutar } = useAccion();
  const [subiendo, setSubiendo] = useState(false);
  const [porEliminar, setPorEliminar] = useState<Documento | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const manuales = state.documentos.filter(esManual).length;
  const limiteAlcanzado = manuales >= LIMITE_REGISTROS;

  const vinculo = (d: Documento): string => {
    if (d.entidad === 'Venta') return `Factura ${state.ventas.find((v) => v.id === d.entidadId)?.numero ?? ''}`;
    if (d.entidad === 'Compra') return `Recepción ${state.compras.find((c) => c.id === d.entidadId)?.numero ?? ''}`;
    return 'Sin vínculo';
  };

  const columnas: ColumnaTabla<Documento>[] = [
    { titulo: 'Archivo', celda: (d) => d.nombre },
    { titulo: 'Tipo', celda: (d) => <Insignia texto={d.tipo} /> },
    { titulo: 'Vinculado a', celda: vinculo },
    { titulo: 'Tamaño', celda: (d) => `${d.tamanoKb} KB`, derecha: true },
    { titulo: 'Fecha', celda: (d) => formatFechaHora(d.fecha) },
    { titulo: 'Ubicación en S3', celda: (d) => <span className="font-mono text-xs text-slate-500">{d.rutaS3}</span> },
  ];

  const eliminar = async () => {
    if (!porEliminar) return;
    const doc = porEliminar;
    const r = await ejecutar(() => api.documentos.eliminar(doc.id));
    setAviso(r.ok ? { ok: true, texto: 'Documento eliminado.' } : { ok: false, texto: r.error });
    setPorEliminar(null);
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => { setAviso(null); setSubiendo(true); }}
          disabled={limiteAlcanzado}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          Subir documento
        </button>
      </div>

      {Number.isFinite(LIMITE_REGISTROS) && (
        <p className="text-sm text-slate-500">
          {manuales} de {LIMITE_REGISTROS} documentos subidos permitidos en esta versión de prueba. Los generados por el sistema no cuentan.
        </p>
      )}

      {aviso && (
        <div role="status" className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
          aviso.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <span>{aviso.texto}</span>
          <button onClick={() => setAviso(null)} className="underline shrink-0">Cerrar</button>
        </div>
      )}

      <DataTable
        columnas={columnas}
        filas={state.documentos}
        clave={(d) => d.id}
        vacio={<EmptyState titulo="Aún no hay documentos" descripcion="Al registrar una venta o compra se archiva su comprobante o factura aquí." />}
        acciones={(d) => esManual(d) ? (
          <button onClick={() => { setAviso(null); setPorEliminar(d); }} aria-label={`Eliminar ${d.nombre}`}
            className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        ) : d.tipo === 'Comprobante de venta' ? (
          <Link to={ruta('ventas', `comprobante/${d.entidadId}`)}
            className="px-3 py-1.5 rounded-lg text-sm text-teal-700 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            Ver
          </Link>
        ) : null}
      />

      {subiendo && (
        <Modal titulo="Subir documento" onCerrar={() => setSubiendo(false)}>
          <FormularioDocumento
            state={state}
            onGuardar={api.documentos.registrar}
            onExito={() => { setSubiendo(false); setAviso({ ok: true, texto: 'Documento registrado.' }); }}
            onCancelar={() => setSubiendo(false)}
          />
        </Modal>
      )}

      {porEliminar && (
        <Modal titulo="Eliminar documento" onCerrar={() => setPorEliminar(null)} ancho="sm">
          <p className="text-sm text-slate-600">Se eliminará {porEliminar.nombre}. Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setPorEliminar(null)}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              Cancelar
            </button>
            <button onClick={eliminar} disabled={enviando}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
              {enviando ? 'Eliminando…' : 'Eliminar documento'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
