import { useState } from 'react';
import { stockDe } from '../../../core/services/erpStore';
import { Buscador } from '../../../core/components/Buscador';
import { Opciones } from '../../../core/components/Opciones';
import { useAccion } from '../../../core/hooks/useAccion';
import type { ErpState, Resultado } from '../../../core/types';

interface Props {
  state: ErpState;
  onGuardar: (d: { productoId: string; almacenId: string; tipo: 'Entrada' | 'Salida'; cantidad: number; motivo: string }) => Resultado | Promise<Resultado>;
  onExito: () => void;
  onCancelar: () => void;
}

const activos = <T extends { id: string; estado: string }>(l: T[]): T[] => l.filter((x) => x.estado === 'Activo');
const unico = <T extends { id: string; estado: string }>(l: T[]): string => (activos(l).length === 1 ? activos(l)[0].id : '');

export const FormularioAjuste: React.FC<Props> = ({ state, onGuardar, onExito, onCancelar }) => {
  const { enviando, ejecutar } = useAccion();
  const [productoId, setProductoId] = useState(unico(state.productos));
  const [almacenId, setAlmacenId] = useState(unico(state.almacenes));
  const [tipo, setTipo] = useState<'Entrada' | 'Salida'>('Salida');
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stock = productoId && almacenId ? stockDe(state.movimientos, productoId, almacenId) : null;
  const campo = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
  const etiqueta = 'block text-sm font-medium text-slate-700 mb-1';

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await ejecutar(() => onGuardar({ productoId, almacenId, tipo, cantidad: Number(cantidad), motivo }));
    if (r.ok) onExito();
    else setError(r.error);
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="aj-producto" className={etiqueta}>Producto</label>
          <Buscador
            id="aj-producto" value={productoId} onChange={setProductoId} claseInput={campo}
            opciones={activos(state.productos).map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` }))}
            placeholder="Buscar por código o nombre"
          />
        </div>
        <div>
          <label htmlFor="aj-almacen" className={etiqueta}>Almacén</label>
          <Buscador
            id="aj-almacen" value={almacenId} onChange={setAlmacenId} claseInput={campo} placeholder="Buscar almacén"
            opciones={activos(state.almacenes).map((a) => ({ value: a.id, label: a.nombre, detalle: a.direccion }))}
          />
        </div>
        <div>
          <span className={etiqueta}>Tipo de ajuste</span>
          <Opciones<'Entrada' | 'Salida'>
            id="aj-tipo" etiqueta="Tipo de ajuste" value={tipo} onChange={setTipo}
            opciones={[{ value: 'Salida', label: 'Salida' }, { value: 'Entrada', label: 'Entrada' }]}
          />
        </div>
        <div>
          <label htmlFor="aj-cantidad" className={etiqueta}>Cantidad</label>
          <input id="aj-cantidad" type="number" min={1} step={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={campo} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="aj-motivo" className={etiqueta}>Motivo</label>
          <input id="aj-motivo" type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={campo} placeholder="Ej.: producto dañado en almacén" />
        </div>
      </div>

      {stock !== null && <p className="text-sm text-slate-500">Stock actual en el almacén: {stock}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
          Cancelar
        </button>
        <button type="submit" disabled={enviando}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
          {enviando ? 'Guardando…' : 'Registrar ajuste'}
        </button>
      </div>
    </form>
  );
};
