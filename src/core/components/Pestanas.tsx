interface Pestana<T extends string> { id: T; titulo: string }

interface Props<T extends string> {
  etiqueta: string;
  pestanas: Pestana<T>[];
  activa: T;
  onCambiar: (id: T) => void;
}

export function Pestanas<T extends string>({ etiqueta, pestanas, activa, onCambiar }: Props<T>) {
  return (
    <div role="tablist" aria-label={etiqueta} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200">
      {pestanas.map((p) => {
        const seleccionada = p.id === activa;
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={seleccionada}
            onClick={() => onCambiar(p.id)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-t-lg ${
              seleccionada ? 'border-teal-600 text-teal-700 font-medium' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {p.titulo}
          </button>
        );
      })}
    </div>
  );
}
