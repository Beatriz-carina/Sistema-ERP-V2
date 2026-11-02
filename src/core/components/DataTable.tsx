import type { ReactNode } from 'react';

export interface ColumnaTabla<T> {
  titulo: string;
  celda: (fila: T) => ReactNode;
  derecha?: boolean;
}

interface Props<T> {
  columnas: ColumnaTabla<T>[];
  filas: T[];
  clave: (fila: T) => string;
  acciones?: (fila: T) => ReactNode;
  vacio: ReactNode;
}

export function DataTable<T>({ columnas, filas, clave, acciones, vacio }: Props<T>) {
  if (filas.length === 0) return <>{vacio}</>;

  return (
    <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
            {columnas.map((c) => (
              <th key={c.titulo} className={`px-4 py-3 font-medium ${c.derecha ? 'text-right' : 'text-left'}`}>
                {c.titulo}
              </th>
            ))}
            {acciones && <th className="px-4 py-3 w-px"><span className="sr-only">Acciones</span></th>}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={clave(fila)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
              {columnas.map((c) => (
                <td key={c.titulo} className={`px-4 py-3 text-slate-700 ${c.derecha ? 'text-right tabular-nums' : ''}`}>
                  {c.celda(fila)}
                </td>
              ))}
              {acciones && <td className="px-4 py-3 whitespace-nowrap text-right">{acciones(fila)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
