import { Menu } from 'lucide-react';
import { usePermisos } from '../core/hooks/usePermisos';

interface Props {
  titulo: string;
  onOpenMenu: () => void;
}

const iniciales = (nombre: string): string =>
  nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export const ErpHeader: React.FC<Props> = ({ titulo, onOpenMenu }) => {
  const { usuario, rol } = usePermisos();
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
        <h1 className="text-lg font-semibold text-slate-900">{titulo}</h1>
      </div>

      <div className="flex items-center gap-3">
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
