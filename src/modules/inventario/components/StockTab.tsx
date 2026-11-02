import { useErp } from '../../../core/hooks/useErp';
import { stockDe } from '../../../core/services/erpStore';
import { formatMoneda } from '../../../core/utils/format';
import { DataTable, type ColumnaTabla } from '../../../core/components/DataTable';
import { EmptyState } from '../../../core/components/EmptyState';
import { Indicador } from '../../../core/components/Indicador';
import { Insignia } from '../../../core/components/Insignia';

interface FilaStock {
  clave: string; codigo: string; producto: string; almacen: string;
  stock: number; minimo: number; valor: number; estado: 'Normal' | 'Stock bajo' | 'Sin stock';
}

export const StockTab: React.FC = () => {
  const { state } = useErp();

  const filas: FilaStock[] = state.productos.flatMap((p) =>
    state.almacenes.map((a) => {
      const stock = stockDe(state.movimientos, p.id, a.id);
      return {
        clave: `${p.id}-${a.id}`, codigo: p.codigo, producto: p.nombre, almacen: a.nombre,
        stock, minimo: p.stockMinimo, valor: stock * p.precioCompra,
        estado: stock === 0 ? 'Sin stock' : stock <= p.stockMinimo ? 'Stock bajo' : 'Normal',
      };
    }),
  );

  const unidades = filas.reduce((a, f) => a + f.stock, 0);
  const valor = filas.reduce((a, f) => a + f.valor, 0);
  const alertas = filas.filter((f) => f.estado !== 'Normal').length;

  const columnas: ColumnaTabla<FilaStock>[] = [
    { titulo: 'Código', celda: (f) => f.codigo },
    { titulo: 'Producto', celda: (f) => f.producto },
    { titulo: 'Almacén', celda: (f) => f.almacen },
    { titulo: 'Stock', celda: (f) => f.stock, derecha: true },
    { titulo: 'Mínimo', celda: (f) => f.minimo, derecha: true },
    { titulo: 'Valor a costo', celda: (f) => formatMoneda(f.valor), derecha: true },
    { titulo: 'Situación', celda: (f) => <Insignia texto={f.estado} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Unidades en stock" valor={unidades} />
        <Indicador titulo="Valor del inventario" valor={formatMoneda(valor)} nota="Stock por precio de compra" />
        <Indicador titulo="Productos con alerta" valor={alertas} nota="Sin stock o bajo el mínimo" />
      </div>
      <DataTable
        columnas={columnas}
        filas={filas}
        clave={(f) => f.clave}
        vacio={<EmptyState titulo="No hay productos para mostrar" descripcion="Registra un producto y un almacén en Mantenimiento." />}
      />
    </div>
  );
};
