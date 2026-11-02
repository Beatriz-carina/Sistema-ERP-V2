import { useId, useMemo, useState } from 'react';

export interface OpcionBuscador {
  value: string;
  label: string;
  /** Texto secundario que también se puede buscar, por ejemplo el RUC. */
  detalle?: string;
}

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  opciones: OpcionBuscador[];
  placeholder?: string;
  /** Clases del campo, para que coincida con el resto del formulario. */
  claseInput?: string;
}

const normalizar = (t: string): string => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const CLASE_BASE = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

/** Lista desplegable con búsqueda, para datos que pueden ser muchos (clientes, proveedores, productos). */
export const Buscador: React.FC<Props> = ({ id, value, onChange, opciones, placeholder = 'Buscar...', claseInput }) => {
  const listaId = useId();
  const seleccionada = opciones.find((o) => o.value === value);
  /** null = la persona no está escribiendo: se muestra la opción elegida. */
  const [texto, setTexto] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);

  const consulta = normalizar(texto ?? '');
  const filtradas = useMemo(
    () => (consulta === '' ? opciones : opciones.filter((o) => normalizar(`${o.label} ${o.detalle ?? ''}`).includes(consulta))),
    [opciones, consulta],
  );

  const abrir = () => {
    setAbierto(true);
    const i = filtradas.findIndex((o) => o.value === value);
    setActivo(i >= 0 ? i : 0);
  };
  const cerrar = () => { setAbierto(false); setTexto(null); };
  const elegir = (o: OpcionBuscador) => { onChange(o.value); cerrar(); };

  const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!abierto) abrir(); else setActivo((a) => Math.min(a + 1, Math.max(filtradas.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && abierto && filtradas[activo]) {
      e.preventDefault();                   // no enviar el formulario: solo elegir
      elegir(filtradas[activo]);
    } else if (e.key === 'Escape' && abierto) {
      e.stopPropagation();                  // cierra la lista sin cerrar la ventana que la contiene
      cerrar();
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={abierto && filtradas[activo] ? `${listaId}-${activo}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={texto ?? seleccionada?.label ?? ''}
        onFocus={abrir}
        onClick={() => { if (!abierto) abrir(); }}
        onBlur={cerrar}
        onKeyDown={alTeclear}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          setActivo(0);
          if (value !== '') onChange('');   // al escribir se descarta la selección anterior
        }}
        className={claseInput ?? CLASE_BASE}
      />
      {abierto && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtradas.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-slate-500">Sin resultados</li>
          ) : filtradas.map((o, i) => (
            <li
              key={o.value}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={i === activo}
              onMouseDown={(e) => e.preventDefault()}   // evita que el campo pierda el foco antes del clic
              onClick={() => elegir(o)}
              onMouseEnter={() => setActivo(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === activo ? 'bg-teal-50 text-teal-900' : 'text-slate-700'}`}
            >
              <span className="block">{o.label}</span>
              {o.detalle && <span className="block text-xs text-slate-500">{o.detalle}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
