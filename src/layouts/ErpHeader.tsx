import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePermisos } from '../core/hooks/usePermisos';
import { useErp } from '../core/hooks/useErp';
import { ruta } from '../core/config/navigation';
import { saldoDeCaja, sesionAbierta } from '../core/services/erpStore';
import { formatFechaHora, formatMoneda } from '../core/utils/format';

interface Props {
  titulo: string;
  /** Una línea que explica para qué sirve el módulo abierto. */
  descripcion?: string;
  onOpenMenu: () => void;
}

const iniciales = (nombre: string): string =>
  nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export const ErpHeader: React.FC<Props> = ({ titulo, descripcion, onOpenMenu }) => {
  const { usuario, rol, puede } = usePermisos();
  const { state } = useErp();
  const caja = sesionAbierta(state.sesionesCaja);
  const nombre = usuario?.nombre ?? 'Sin sesión';

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMenu}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="leading-tight">
          <h1 className="text-lg font-semibold text-slate-900">{titulo}</h1>
          {descripcion && <p className="text-xs text-slate-500 hidden md:block">{descripcion}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {puede('tesoreria') && (
          <Link
            to={ruta('tesoreria', 'caja')}
            title={caja ? `${caja.numero} abierta el ${formatFechaHora(caja.fechaApertura)}` : 'Ir a Tesorería › Caja para abrirla'}
            className={`hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
              caja ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <span aria-hidden="true" className={`w-2 h-2 rounded-full ${caja ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {caja ? `Caja abierta · ${formatMoneda(saldoDeCaja(state.caja))}` : 'Caja cerrada'}
          </Link>
        )}
        <div className="text-right leading-tight hidden sm:block">
          <p className="text-sm font-medium text-slate-800">{nombre}</p>
          <p className="text-xs text-slate-500">{rol?.nombre ?? 'Sin rol'}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-slate-900 text-white text-sm font-medium flex items-center justify-center">
          {iniciales(nombre)}
        </div>
      </div>
    </header>
  );
};
