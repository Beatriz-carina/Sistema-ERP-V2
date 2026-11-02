import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: 'sm' | 'lg';
}

export const Modal: React.FC<Props> = ({ titulo, onCerrar, children, ancho = 'lg' }) => {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" onMouseDown={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${ancho === 'sm' ? 'max-w-md' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
