import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useErp } from '../../../core/hooks/useErp';
import { useAccion } from '../../../core/hooks/useAccion';
import { api } from '../../../core/services/api';
import { LIMITE_REGISTROS } from '../../../core/services/erpStore';
import { DataTable, type ColumnaTabla } from '../../../core/components/DataTable';
import { EmptyState } from '../../../core/components/EmptyState';
import { Insignia } from '../../../core/components/Insignia';
import { Modal } from '../../../core/components/Modal';
import type { ConfigMaestro, Valores } from '../config/maestros';
import { FormularioMaestro } from './FormularioMaestro';

interface Aviso { tipo: 'ok' | 'error'; texto: string }

export const MaestroCrud: React.FC<{ config: ConfigMaestro }> = ({ config }) => {
  const { state } = useErp();
  const { enviando, ejecutar } = useAccion();
  const filas = state[config.coleccion] as unknown as Valores[];
  const limiteAlcanzado = filas.length >= LIMITE_REGISTROS;
  const fem = config.genero === 'f';
  const el = fem ? 'la' : 'el';

  const [editando, setEditando] = useState<Valores | 'nuevo' | null>(null);
  const [porEliminar, setPorEliminar] = useState<Valores | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const columnas: ColumnaTabla<Valores>[] = config.columnas.map((c) => ({
    titulo: c.titulo,
    derecha: c.derecha,
    celda: (f) => (c.badge ? <Insignia texto={String(c.celda(f, state))} /> : c.celda(f, state)),
  }));

  const guardar = async (valores: Valores) => {
    const r = await ejecutar(() => editando === 'nuevo'
      ? api.maestros.crear(config.coleccion, valores as never)
      : api.maestros.actualizar(config.coleccion, String((editando as Valores).id), valores as never));

    setAviso(r.ok
      ? { tipo: 'ok', texto: editando === 'nuevo' ? `Se creó ${el} ${config.singular}.` : 'Los cambios se guardaron.' }
      : { tipo: 'error', texto: r.error });
    setEditando(null);
  };

  const eliminar = async () => {
    if (!porEliminar) return;
    const fila = porEliminar;
    const r = await ejecutar(() => api.maestros.eliminar(config.coleccion, String(fila.id)));
    setAviso(r.ok ? { tipo: 'ok', texto: `Se eliminó ${el} ${config.singular}.` } : { tipo: 'error', texto: r.error });
    setPorEliminar(null);
  };

  const botonNuevo = (
    <button
      onClick={() => { setAviso(null); setEditando('nuevo'); }}
      disabled={limiteAlcanzado}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
    >
      <Plus className="w-4 h-4" />
      {fem ? 'Nueva' : 'Nuevo'} {config.singular}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {Number.isFinite(LIMITE_REGISTROS)
            ? `${filas.length} de ${LIMITE_REGISTROS} ${config.plural} ${fem ? 'permitidas' : 'permitidos'} en esta versión de prueba.`
            : `${filas.length} ${filas.length === 1 ? config.singular : config.plural} ${fem ? 'registrada' : 'registrado'}${filas.length === 1 ? '' : 's'}.`}
        </p>
        {botonNuevo}
      </div>

      {aviso && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            aviso.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{aviso.texto}</span>
          <button onClick={() => setAviso(null)} className="underline shrink-0">Cerrar</button>
        </div>
      )}

      <DataTable
        columnas={columnas}
        filas={filas}
        clave={(f) => String(f.id)}
        vacio={
          <EmptyState
            titulo={`Aún no hay ${config.plural}`}
            descripcion={`Crea ${fem ? 'la primera' : 'el primer'} ${config.singular}.`}
            accion={botonNuevo}
          />
        }
        acciones={(f) => (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => { setAviso(null); setEditando(f); }}
              aria-label={`Editar ${config.singular}`}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setAviso(null); setPorEliminar(f); }}
              aria-label={`Eliminar ${config.singular}`}
              className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {editando && (
        <Modal
          titulo={editando === 'nuevo' ? `${fem ? 'Nueva' : 'Nuevo'} ${config.singular}` : `Editar ${config.singular}`}
          onCerrar={() => setEditando(null)}
        >
          <FormularioMaestro
            config={config}
            state={state}
            inicial={editando === 'nuevo' ? config.inicial : editando}
            esEdicion={editando !== 'nuevo'}
            onGuardar={guardar}
            onCancelar={() => setEditando(null)}
            enviando={enviando}
          />
        </Modal>
      )}

      {porEliminar && (
        <Modal titulo={`Eliminar ${config.singular}`} onCerrar={() => setPorEliminar(null)} ancho="sm">
          <p className="text-sm text-slate-600">
            Esta acción no se puede deshacer. Si el registro ya se usó en otros módulos, el sistema no permitirá eliminarlo.
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setPorEliminar(null)}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              Cancelar
            </button>
            <button onClick={eliminar} disabled={enviando}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
              {enviando ? 'Eliminando…' : `Eliminar ${config.singular}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
