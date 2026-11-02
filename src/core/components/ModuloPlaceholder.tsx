import type { ErpModulo } from '../config/navigation';

/** Módulo aún no construido. */
export const ModuloPlaceholder: React.FC<{ modulo: ErpModulo }> = ({ modulo }) => {
  const Icon = modulo.icon;

  return (
    <div className="max-w-6xl">
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-16 flex flex-col items-center text-center">
        <div className="p-3 rounded-xl bg-teal-50 text-teal-700">
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="mt-4 font-semibold text-slate-900">{modulo.nombre}</h2>
        <p className="mt-1 text-sm text-slate-500">Próximamente</p>
      </div>
    </div>
  );
};
