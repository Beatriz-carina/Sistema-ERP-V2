import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useErp } from '../../../core/hooks/useErp';
import { ruta } from '../../../core/config/navigation';
import { MAESTROS } from '../config/maestros';
import { GRUPOS_TARJETAS, TARJETAS } from '../config/tarjetas';
import { MaestroCrud } from '../components/MaestroCrud';

const Tarjetas: React.FC = () => {
  const { state } = useErp();

  return (
    <div className="space-y-8">
      {GRUPOS_TARJETAS.map((grupo) => (
        <section key={grupo} aria-label={grupo} className="space-y-3">
          <h2 className="font-semibold text-slate-900">{grupo}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {MAESTROS.filter((m) => TARJETAS[m.coleccion]?.grupo === grupo).map((m) => {
              const t = TARJETAS[m.coleccion];
              const Icono = t.icon;
              const cantidad = (state[m.coleccion] as unknown[]).length;
              return (
                <Link
                  key={m.coleccion}
                  to={ruta('mantenimiento', m.coleccion)}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-teal-300 hover:bg-teal-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  <span className="p-2 rounded-lg bg-teal-50 text-teal-700 shrink-0"><Icono className="w-4 h-4" /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-slate-900">{m.tab}</span>
                    <span className="block text-xs text-slate-500">{cantidad} {cantidad === 1 ? 'registro' : 'registros'}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="w-4 h-4 text-slate-300 group-hover:text-teal-600 shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

const Entidad: React.FC = () => {
  const { entidad } = useParams<{ entidad: string }>();
  const config = MAESTROS.find((m) => m.coleccion === entidad);
  if (!config) return <Navigate to={ruta('mantenimiento')} replace />;

  return (
    <div className="space-y-5">
      <Link
        to={ruta('mantenimiento')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Mantenimiento
      </Link>
      <h2 className="text-xl font-semibold text-slate-900">{config.tab}</h2>
      <MaestroCrud key={config.coleccion} config={config} />
    </div>
  );
};

export const MantenimientoPage: React.FC = () => (
  <div className="max-w-6xl">
    <Routes>
      <Route index element={<Tarjetas />} />
      <Route path=":entidad" element={<Entidad />} />
    </Routes>
  </div>
);
