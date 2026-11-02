import { Link } from 'react-router-dom';
import { ERP_BASE } from '../config/navigation';

export const SinAcceso: React.FC = () => (
  <div className="max-w-xl bg-white border border-slate-200 rounded-xl px-6 py-10 text-center mx-auto mt-8">
    <p className="font-semibold text-slate-900">No tienes acceso a este módulo</p>
    <p className="text-sm text-slate-500 mt-1">
      Tu rol no incluye este módulo. Un administrador puede habilitarlo en Administración, sección Roles y permisos.
    </p>
    <Link to={`${ERP_BASE}/dashboard`} className="inline-block mt-4 text-sm font-medium text-teal-700 hover:text-teal-800 underline">
      Volver al Dashboard
    </Link>
  </div>
);
