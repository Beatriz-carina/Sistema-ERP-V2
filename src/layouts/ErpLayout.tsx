import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ErpSidebar } from './ErpSidebar';
import { ErpHeader } from './ErpHeader';
import { ERP_MODULOS } from '../core/config/navigation';

export const ErpLayout: React.FC = () => {
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const actual = ERP_MODULOS.find((m) => pathname.includes(`/${m.path}`));

  return (
    <div className="h-screen flex bg-slate-50 text-slate-800">
      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ErpSidebar onNavigate={() => setMenuAbierto(false)} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <ErpHeader
          titulo={actual?.nombre ?? 'EnterpriseCloud'}
          onOpenMenu={() => setMenuAbierto(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
