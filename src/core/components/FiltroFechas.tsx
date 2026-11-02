import { useState } from 'react';
import { fechaLocal } from '../utils/format';

export function useFiltroFechas() {
  const hoy = fechaLocal(new Date().toISOString());
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);

  const invalido = desde !== '' && hasta !== '' && desde > hasta;
  const enRango = (iso: string): boolean => {
    if (invalido) return false;
    const f = fechaLocal(iso);
    return (desde === '' || f >= desde) && (hasta === '' || f <= hasta);
  };

  return {
    desde, hasta, setDesde, setHasta, enRango, invalido,
    esHoy: desde === hoy && hasta === hoy,
    soloHoy: () => { setDesde(hoy); setHasta(hoy); },
    verTodo: () => { setDesde(''); setHasta(''); },
  };
}

export type FiltroFechasEstado = ReturnType<typeof useFiltroFechas>;

export const FiltroFechas: React.FC<{ filtro: FiltroFechasEstado }> = ({ filtro }) => {
  const campo = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
  const boton = 'text-sm text-teal-700 underline pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded';
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="ff-desde" className="block text-xs text-slate-500 mb-1">Desde</label>
        <input id="ff-desde" type="date" value={filtro.desde} onChange={(e) => filtro.setDesde(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor="ff-hasta" className="block text-xs text-slate-500 mb-1">Hasta</label>
        <input id="ff-hasta" type="date" value={filtro.hasta} onChange={(e) => filtro.setHasta(e.target.value)} className={campo} />
      </div>
      <button type="button" onClick={filtro.soloHoy} className={boton}>Hoy</button>
      <button type="button" onClick={filtro.verTodo} className={boton}>Ver todo</button>
      {filtro.invalido && <p role="alert" className="text-sm text-amber-700 pb-2">La fecha inicial no puede ser posterior a la final.</p>}
    </div>
  );
};
