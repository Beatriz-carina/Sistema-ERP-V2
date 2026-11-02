import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
}

export const EmptyState: React.FC<Props> = ({ titulo, descripcion, accion }) => (
  <div className="bg-white border border-dashed border-slate-300 rounded-xl px-6 py-12 text-center">
    <p className="font-medium text-slate-800">{titulo}</p>
    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{descripcion}</p>
    {accion && <div className="mt-4">{accion}</div>}
  </div>
);
