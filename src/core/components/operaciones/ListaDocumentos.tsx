import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useErp } from '../../hooks/useErp';
import { LIMITE_REGISTROS } from '../../services/erpStore';
import { ruta } from '../../config/navigation';
import type { FilaDocumento } from '../../utils/filas';
import { formatFecha, formatMoneda } from '../../utils/format';
import { DataTable, type ColumnaTabla } from '../DataTable';
import { EmptyState } from '../EmptyState';
import { FiltroFechas, useFiltroFechas } from '../FiltroFechas';
import { Indicador } from '../Indicador';
import { Insignia } from '../Insignia';
import { DetalleOperacion } from './DetalleOperacion';

interface Props {
  /** Nombre del documento en singular y plural, para los textos. */
  documento: { articulo: 'un' | 'una'; singular: string; plural: string; tituloDetalle: string };
  etiquetaTercero: 'Cliente' | 'Proveedor';
  etiquetaEstado: string;
  filas: FilaDocumento[];
  /** Estados que cuentan como "esperando acción". */
  estadosPendientes: string[];
  etiquetaPendientes: string;
  /** Si se omite, la lista es solo de consulta. */
  nuevo?: { texto: string; onClick: () => void; faltantes: string[] };
  accionFila?: (fila: FilaDocumento) => ReactNode;
  vacio: string;
}

export const ListaDocumentos: React.FC<Props> = ({
  documento, etiquetaTercero, etiquetaEstado, filas, estadosPendientes, etiquetaPendientes, nuevo, accionFila, vacio,
}) => {
  const { state } = useErp();
  const filtro = useFiltroFechas();
  const [detalle, setDetalle] = useState<FilaDocumento | null>(null);

  const visibles = filas.filter((f) => filtro.enRango(f.fecha));
  const ocultas = filas.length - visibles.length;
  const limiteAlcanzado = filas.length >= LIMITE_REGISTROS;
  const bloqueado = nuevo ? limiteAlcanzado || nuevo.faltantes.length > 0 : true;

  const columnas: ColumnaTabla<FilaDocumento>[] = [
    { titulo: 'Número', celda: (f) => f.numero },
    { titulo: 'Fecha', celda: (f) => formatFecha(f.fecha) },
    { titulo: etiquetaTercero, celda: (f) => f.tercero },
    { titulo: 'Condición', celda: (f) => <Insignia texto={f.condicion} /> },
    { titulo: 'Total', celda: (f) => formatMoneda(f.total), derecha: true },
    { titulo: etiquetaEstado, celda: (f) => <Insignia texto={f.estado} /> },
  ];

  return (
    <div className="space-y-4">
      {nuevo && nuevo.faltantes.length > 0 && (
        <div role="status" className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Para registrar {documento.articulo} {documento.singular} primero debes crear {nuevo.faltantes.join(', ')} en{' '}
          <Link to={ruta('mantenimiento')} className="underline font-medium">Mantenimiento</Link>.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo={documento.plural.charAt(0).toUpperCase() + documento.plural.slice(1)} valor={visibles.length} nota={filtro.esHoy ? 'De hoy' : 'En el período filtrado'} />
        <Indicador titulo="Importe total" valor={formatMoneda(visibles.reduce((a, f) => a + f.total, 0))} nota="IGV incluido" />
        <Indicador titulo={etiquetaPendientes} valor={visibles.filter((f) => estadosPendientes.includes(f.estado)).length} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <FiltroFechas filtro={filtro} />
        {nuevo && (
          <button
            onClick={nuevo.onClick}
            disabled={bloqueado}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            {nuevo.texto}
          </button>
        )}
      </div>

      {nuevo && Number.isFinite(LIMITE_REGISTROS) && (
        <p className="text-sm text-slate-500">
          {filas.length} de {LIMITE_REGISTROS} {documento.plural} permitidas en esta versión de prueba.
        </p>
      )}

      {ocultas > 0 && !filtro.invalido && (
        <p className="text-sm text-slate-500">
          Hay {ocultas} {ocultas === 1 ? documento.singular : documento.plural} fuera del período filtrado.{' '}
          <button onClick={filtro.verTodo} className="text-teal-700 underline">Ver todo</button>
        </p>
      )}

      <DataTable
        columnas={columnas}
        filas={visibles}
        clave={(f) => f.id}
        vacio={<EmptyState titulo={`Sin ${documento.plural} en este período`} descripcion={vacio} />}
        acciones={(f) => (
          <div className="flex items-center justify-end gap-1">
            {accionFila?.(f)}
            <button onClick={() => setDetalle(f)}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              Ver detalle
            </button>
          </div>
        )}
      />

      {detalle && (
        <DetalleOperacion
          titulo={documento.tituloDetalle}
          etiquetaTercero={etiquetaTercero}
          fila={detalle}
          state={state}
          onCerrar={() => setDetalle(null)}
        />
      )}
    </div>
  );
};
