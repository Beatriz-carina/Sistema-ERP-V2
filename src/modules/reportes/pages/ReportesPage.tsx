import { useState } from 'react';
import { Download } from 'lucide-react';
import { useErp } from '../../../core/hooks/useErp';
import { aCsv, descargarCsv } from '../../../core/utils/csv';
import { formatMoneda } from '../../../core/utils/format';
import { DataTable, type ColumnaTabla } from '../../../core/components/DataTable';
import { EmptyState } from '../../../core/components/EmptyState';
import { Pestanas } from '../../../core/components/Pestanas';
import { REPORTES, conTotal, type CeldaReporte } from '../config/reportes';

export const ReportesPage: React.FC = () => {
  const { state } = useErp();
  const [id, setId] = useState(REPORTES[0].id);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const reporte = REPORTES.find((r) => r.id === id) ?? REPORTES[0];
  const rangoInvalido = reporte.usaFechas && desde !== '' && hasta !== '' && desde > hasta;
  const filas = rangoInvalido ? [] : conTotal(reporte, reporte.filas(state, desde, hasta));

  const formato = (v: CeldaReporte, tipo: string): string | number =>
    tipo === 'moneda' && typeof v === 'number' ? formatMoneda(v) : v;

  const columnas: ColumnaTabla<CeldaReporte[]>[] = reporte.columnas.map((c, i) => ({
    titulo: c.titulo,
    derecha: c.tipo !== 'texto',
    celda: (f) => <span className={f[0] === 'Total' ? 'font-semibold text-slate-900' : ''}>{formato(f[i], c.tipo)}</span>,
  }));

  const exportar = () =>
    descargarCsv(`${reporte.id}.csv`, aCsv(reporte.columnas.map((c) => c.titulo), filas));

  const campoFecha = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

  return (
    <div className="max-w-6xl space-y-6">
      <Pestanas
        etiqueta="Reportes"
        pestanas={REPORTES.map((r) => ({ id: r.id, titulo: r.titulo }))}
        activa={id}
        onCambiar={setId}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {reporte.usaFechas && (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="rep-desde" className="block text-xs text-slate-500 mb-1">Desde</label>
                <input id="rep-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={campoFecha} />
              </div>
              <div>
                <label htmlFor="rep-hasta" className="block text-xs text-slate-500 mb-1">Hasta</label>
                <input id="rep-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={campoFecha} />
              </div>
              {(desde !== '' || hasta !== '') && (
                <button onClick={() => { setDesde(''); setHasta(''); }} className="text-sm text-teal-700 underline pb-2">
                  Quitar filtro
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={exportar}
          disabled={filas.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {rangoInvalido && (
        <p role="alert" className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          La fecha inicial no puede ser posterior a la final.
        </p>
      )}

      <DataTable
        columnas={columnas}
        filas={filas}
        clave={(f) => f.join('|')}
        vacio={
          <EmptyState
            titulo="Sin datos para este reporte"
            descripcion={rangoInvalido ? 'Corrige el rango de fechas.' : 'Registra operaciones o amplía el rango de fechas.'}
          />
        }
      />
    </div>
  );
};
