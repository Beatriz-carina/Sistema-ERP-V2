import { Link } from 'react-router-dom';

export interface Aviso {
  ok: boolean;
  texto: string;
  /** Siguiente paso sugerido. */
  siguiente?: { to: string; texto: string };
}

interface Props {
  aviso: Aviso;
  onCerrar: () => void;
}

export const AvisoFlujo: React.FC<Props> = ({ aviso, onCerrar }) => (
  <div
    role="status"
    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
      aviso.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
    }`}
  >
    <span>{aviso.texto}</span>
    <span className="flex items-center gap-4 shrink-0">
      {aviso.siguiente && (
        <Link
          to={aviso.siguiente.to}
          className="rounded-lg bg-white/80 border border-current/20 px-3 py-1.5 font-medium underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          {aviso.siguiente.texto}
        </Link>
      )}
      <button onClick={onCerrar} className="underline">Cerrar</button>
    </span>
  </div>
);
