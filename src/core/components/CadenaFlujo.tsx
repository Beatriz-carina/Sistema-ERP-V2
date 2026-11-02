import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ruta } from '../config/navigation';
import { usePermisos } from '../hooks/usePermisos';

export interface PasoFlujo {
  /** Pantalla dentro del módulo, por ejemplo "cotizaciones". */
  sub: string;
  titulo: string;
  cantidad: number;
  /** Documentos que esperan una acción en este paso. */
  pendientes: number;
  textoPendiente: string;
  /** Si el paso vive en otro módulo (por ejemplo el cobro, en Tesorería), su nombre. */
  modulo?: string;
}

interface Props {
  modulo: string;
  pasos: PasoFlujo[];
}

/** Muestra el recorrido del módulo y cuántos documentos esperan acción en cada paso. */
export const CadenaFlujo: React.FC<Props> = ({ modulo, pasos }) => {
  const { puede } = usePermisos();
  // Un paso de otro módulo solo se muestra si el rol puede abrir ese módulo.
  const visibles = pasos.filter((p) => !p.modulo || puede(p.modulo));
  return (
    <nav aria-label="Flujo del módulo" className="flex flex-wrap items-stretch gap-y-2">
      {visibles.map((p, i) => (
        <div key={`${p.modulo ?? modulo}-${p.sub}`} className="flex items-center">
          <NavLink
            to={ruta(p.modulo ?? modulo, p.sub)}
            className={({ isActive }) =>
              `block rounded-xl border px-4 py-2.5 min-w-[9.5rem] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                isActive ? 'bg-teal-50 border-teal-300' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`
            }
          >
            <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">{i + 1}</span>
              {p.titulo}
              {p.modulo && <span className="text-xs font-normal text-slate-400">· {p.modulo === 'tesoreria' ? 'Tesorería' : p.modulo}</span>}
            </span>
            <span className="block text-xs mt-1 text-slate-500">
              {p.cantidad} registrado{p.cantidad === 1 ? '' : 's'}
              {p.pendientes > 0 && (
                <span className="ml-2 inline-flex rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 font-medium">
                  {p.pendientes} {p.textoPendiente}
                </span>
              )}
            </span>
          </NavLink>
          {i < visibles.length - 1 && <ChevronRight aria-hidden="true" className="w-4 h-4 text-slate-400 mx-1 shrink-0" />}
        </div>
      ))}
    </nav>
  );
};
