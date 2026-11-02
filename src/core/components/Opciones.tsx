export interface OpcionBoton<T extends string = string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  /** Nombre del grupo, para lectores de pantalla (por ejemplo "Condición de pago"). */
  etiqueta: string;
  value: T;
  onChange: (value: T) => void;
  opciones: OpcionBoton<T>[];
  /** id del grupo, para enlazarlo con su <label>. */
  id?: string;
  tamano?: 'sm' | 'md';
}

/**
 * Elección entre 2 o 3 opciones fijas, todas a la vista (por ejemplo Contado | Crédito).
 * Para listas largas o que crecen se usa Buscador; para unas pocas opciones fijas, un selector.
 */
export function Opciones<T extends string>({ etiqueta, value, onChange, opciones, id, tamano = 'md' }: Props<T>) {
  const alto = tamano === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm';
  return (
    <div id={id} role="radiogroup" aria-label={etiqueta} className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
      {opciones.map((o) => {
        const activo = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(o.value)}
            className={`${alto} rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
              activo ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
