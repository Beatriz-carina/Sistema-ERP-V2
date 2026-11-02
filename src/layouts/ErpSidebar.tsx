import { NavLink, useLocation } from 'react-router-dom';
import { Layers, LogOut } from 'lucide-react';
import { ERP_MENU, ruta } from '../core/config/navigation';
import { usePermisos } from '../core/hooks/usePermisos';
import { useAccion } from '../core/hooks/useAccion';
import { api } from '../core/services/api';

interface Props {
  onNavigate?: () => void;
}

export const ErpSidebar: React.FC<Props> = ({ onNavigate }) => {
  const { puede } = usePermisos();
  const { pathname } = useLocation();
  const { enviando, ejecutar } = useAccion();
  const grupos = ERP_MENU
    .map((g) => ({ ...g, modulos: g.modulos.filter((m) => puede(m.path)) }))
    .filter((g) => g.modulos.length > 0);

  return (
    <aside className="w-64 h-full bg-white border-r border-slate-200 flex flex-col">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200">
        <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center">
          <Layers className="w-5 h-5" />
        </div>
        <div className="leading-tight">
          <p className="font-semibold text-slate-900">EnterpriseCloud</p>
          <p className="text-xs text-slate-500">Gestión empresarial</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            <p className="px-3 mb-1.5 text-xs font-medium text-slate-400">{grupo.titulo}</p>
            <ul className="space-y-0.5">
              {grupo.modulos.map(({ path, nombre, icon: Icon, submodulos }) => {
                const abierto = pathname.startsWith(ruta(path));
                return (
                  <li key={path}>
                    <NavLink
                      to={ruta(path)}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                          isActive
                            ? 'bg-teal-50 text-teal-700 font-medium'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {nombre}
                    </NavLink>

                    {submodulos && abierto && (
                      <ul className="mt-0.5 mb-1 ml-[26px] pl-3 border-l border-slate-200 space-y-0.5">
                        {submodulos.map((s) => (
                          <li key={s.path}>
                            <NavLink
                              to={ruta(path, s.path)}
                              onClick={onNavigate}
                              className={({ isActive }) =>
                                `block px-3 py-1.5 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                                  isActive
                                    ? 'text-teal-700 font-medium bg-teal-50/60'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                }`
                              }
                            >
                              {s.nombre}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200">
        <button
          onClick={() => ejecutar(() => api.auth.logout())}
          disabled={enviando}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {enviando ? 'Saliendo…' : 'Salir'}
        </button>
      </div>
    </aside>
  );
};
