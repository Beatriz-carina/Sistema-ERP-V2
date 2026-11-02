import { useState } from 'react';
import { useErp } from '../../../core/hooks/useErp';
import { formatFechaHora } from '../../../core/utils/format';
import { DataTable, type ColumnaTabla } from '../../../core/components/DataTable';
import { Buscador } from '../../../core/components/Buscador';
import { EmptyState } from '../../../core/components/EmptyState';
import { FiltroFechas, useFiltroFechas } from '../../../core/components/FiltroFechas';
import { Indicador } from '../../../core/components/Indicador';
import { Insignia } from '../../../core/components/Insignia';
import type { MovimientoInventario } from '../../../core/types';

export const MovimientosTab: React.FC = () => {
  const { state } = useErp();
  const filtro = useFiltroFechas();
  const [productoId, setProductoId] = useState('');

  const movimientos = state.movimientos
    .filter((m) => (productoId === '' || m.productoId === productoId) && filtro.enRango(m.fecha))
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const entradas = movimientos.filter((m) => m.tipo === 'Entrada').reduce((a, m) => a + m.cantidad, 0);
  const salidas = movimientos.filter((m) => m.tipo === 'Salida').reduce((a, m) => a + m.cantidad, 0);
  const almacen = (id: string) => state.almacenes.find((a) => a.id === id)?.nombre ?? '-';
  const ocultos = state.movimientos.length - state.movimientos.filter((m) => filtro.enRango(m.fecha)).length;

  const columnas: ColumnaTabla<MovimientoInventario>[] = [
    { titulo: 'Fecha', celda: (m) => formatFechaHora(m.fecha) },
    { titulo: 'Documento', celda: (m) => m.documentoNumero },
    { titulo: 'Origen', celda: (m) => <Insignia texto={m.origen} /> },
    { titulo: 'Almacén', celda: (m) => almacen(m.almacenId) },
    { titulo: 'Entrada', celda: (m) => (m.tipo === 'Entrada' ? m.cantidad : '-'), derecha: true },
    { titulo: 'Salida', celda: (m) => (m.tipo === 'Salida' ? m.cantidad : '-'), derecha: true },
    { titulo: 'Saldo', celda: (m) => m.saldo, derecha: true },
    { titulo: 'Motivo', celda: (m) => m.motivo ?? '' },
  ];

  const campo = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Movimientos" valor={movimientos.length} nota={filtro.esHoy ? 'De hoy' : 'En el período filtrado'} />
        <Indicador titulo="Unidades que entraron" valor={entradas} />
        <Indicador titulo="Unidades que salieron" valor={salidas} />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <FiltroFechas filtro={filtro} />
        <div className="min-w-[16rem]">
          <label htmlFor="mov-producto" className="block text-xs text-slate-500 mb-1">Producto</label>
          <Buscador
            id="mov-producto" value={productoId} onChange={setProductoId} claseInput={campo}
            opciones={state.productos.map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` }))}
            placeholder="Todos los productos"
          />
        </div>
      </div>

      {ocultos > 0 && !filtro.invalido && (
        <p className="text-sm text-slate-500">
          Hay {ocultos} movimiento{ocultos === 1 ? '' : 's'} fuera del período filtrado.{' '}
          <button onClick={filtro.verTodo} className="text-teal-700 underline">Ver todo</button>
        </p>
      )}

      <DataTable
        columnas={columnas}
        filas={movimientos}
        clave={(m) => m.id}
        vacio={<EmptyState titulo="Sin movimientos en este período" descripcion="Cada recepción en Kardex, factura emitida o ajuste deja aquí su entrada o salida con el saldo resultante." />}
      />
    </div>
  );
};
