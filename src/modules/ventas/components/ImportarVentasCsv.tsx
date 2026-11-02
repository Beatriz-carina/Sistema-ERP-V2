import { useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { useErp } from '../../../core/hooks/useErp';
import { useAccion } from '../../../core/hooks/useAccion';
import { api } from '../../../core/services/api';
import { sesionAbierta } from '../../../core/services/erpStore';
import { aCsv, descargarCsv } from '../../../core/utils/csv';
import { Modal } from '../../../core/components/Modal';
import { analizarVentasCsv, COLUMNAS_VENTAS, type AnalisisVentasCsv } from '../config/analisisVentasCsv';

interface Props { onCerrar: () => void }

interface Resultado { facturadas: number; avisos: string[] }

const boton = 'px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2';

/** Carga ventas desde un CSV: cada una se registra y se factura con las mismas reglas que una venta hecha a mano. */
export const ImportarVentasCsv: React.FC<Props> = ({ onCerrar }) => {
  const { state } = useErp();
  const { enviando, ejecutar } = useAccion();
  const [nombre, setNombre] = useState('');
  const [analisis, setAnalisis] = useState<AnalisisVentasCsv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const listas = (analisis?.ventas ?? []).filter((v) => v.datos);
  const conError = (analisis?.ventas ?? []).filter((v) => !v.datos);
  const hayContado = listas.some((v) => v.datos?.condicion === 'Contado');
  const cajaCerrada = !sesionAbierta(state.sesionesCaja);

  const leer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError(null);
    setNombre(archivo.name);
    try {
      setAnalisis(analizarVentasCsv(await archivo.text(), state));
    } catch {
      setAnalisis(null);
      setError('No se pudo leer el archivo.');
    }
  };

  const importar = async () => {
    setError(null);
    const enviadas = listas.map((v) => ({ referencia: v.referencia, ...v.datos! }));
    const r = await ejecutar(() => api.ventas.importar(enviadas as never[]));
    if (r.ok) setResultado({ facturadas: Number(r.id), avisos: r.avisos ?? [] });
    else setError(r.error);
  };

  const plantilla = () => descargarCsv('plantilla-ventas.csv', aCsv(COLUMNAS_VENTAS.map((c) => c.titulo), []));

  if (resultado) {
    return (
      <Modal titulo="Importación terminada" onCerrar={onCerrar}>
        <div className="space-y-4" role="status">
          <p className="text-sm text-slate-700">
            <strong className="text-emerald-700">{resultado.facturadas} venta{resultado.facturadas === 1 ? '' : 's'} facturada{resultado.facturadas === 1 ? '' : 's'}</strong>
            {resultado.avisos.length > 0 && <> y <strong className="text-red-700">{resultado.avisos.length} rechazada{resultado.avisos.length === 1 ? '' : 's'}</strong></>}.
          </p>
          {resultado.avisos.length > 0 && (
            <>
              <p className="text-xs text-slate-500">Las rechazadas no dejaron nada guardado; corrígelas en el archivo y vuelve a importarlas.</p>
              <ul className="max-h-56 overflow-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                {resultado.avisos.map((a) => <li key={a} className="px-3 py-2 text-red-700">{a}</li>)}
              </ul>
            </>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={onCerrar} className={`${boton} bg-teal-600 text-white hover:bg-teal-700`}>Cerrar</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal titulo="Importar ventas desde CSV" onCerrar={onCerrar}>
      <div className="space-y-5">
        <div className="text-sm text-slate-600 space-y-2">
          <p>Sube un archivo CSV (UTF-8, separado por comas o punto y coma) con una fila por producto vendido. La primera fila debe llevar estos títulos:</p>
          <p className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-700">
            {COLUMNAS_VENTAS.map((c, i) => <span key={c.id}>{i > 0 && ' · '}{c.titulo}{c.obligatoria ? ' *' : ''}</span>)}
          </p>
          <p className="text-xs text-slate-500">
            * obligatorio. Las filas con la misma <strong className="font-medium text-slate-600">Venta</strong> forman una sola factura; cliente, vendedor, almacén y condición
            pueden ir solo en la primera. Cliente, vendedor, almacén y producto se escriben por nombre, documento o código y deben existir antes.
            Sin precio unitario se usa el precio de venta del producto. Cada venta pasa por las reglas de siempre (stock, límite de crédito y caja abierta).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={plantilla} className={`${boton} inline-flex items-center gap-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50`}>
            <Download className="w-4 h-4" /> Descargar plantilla
          </button>
          <label className={`${boton} inline-flex items-center gap-2 bg-teal-600 text-white hover:bg-teal-700 cursor-pointer focus-within:ring-2 focus-within:ring-teal-500`}>
            <FileUp className="w-4 h-4" /> Elegir archivo CSV
            <input type="file" accept=".csv,text/csv" onChange={leer} className="sr-only" aria-label="Archivo CSV" />
          </label>
          {nombre && <span className="text-sm text-slate-500">{nombre}</span>}
        </div>

        {analisis?.error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{analisis.error}</p>}

        {analisis && !analisis.error && (
          <div className="space-y-3" role="status">
            <p className="text-sm text-slate-700">
              Se leyeron {analisis.totalLineas} fila{analisis.totalLineas === 1 ? '' : 's'} en {analisis.ventas.length} venta{analisis.ventas.length === 1 ? '' : 's'}:{' '}
              <strong className="text-emerald-700">{listas.length} lista{listas.length === 1 ? '' : 's'}</strong>
              {conError.length > 0 && <> y <strong className="text-red-700">{conError.length} con errores</strong> (se omitirán)</>}.
            </p>
            {analisis.ignoradas.length > 0 && <p className="text-xs text-slate-500">Columnas ignoradas: {analisis.ignoradas.join(', ')}.</p>}
            {hayContado && cajaCerrada && (
              <p className="text-sm text-amber-700">La caja está cerrada: las ventas al contado serán rechazadas. Ábrela en Tesorería › Caja antes de importar.</p>
            )}
            {conError.length > 0 && (
              <ul className="max-h-48 overflow-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                {conError.slice(0, 8).map((v) => (
                  <li key={v.referencia} className="px-3 py-2">
                    <span className="font-medium text-slate-800">Venta {v.referencia}:</span> <span className="text-red-700">{v.errores.join(' ')}</span>
                  </li>
                ))}
                {conError.length > 8 && <li className="px-3 py-2 text-slate-500">…y {conError.length - 8} más.</li>}
              </ul>
            )}
          </div>
        )}

        {error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className={`${boton} font-normal text-slate-600 hover:bg-slate-100`}>Cancelar</button>
          <button type="button" onClick={importar} disabled={enviando || listas.length === 0}
            className={`${boton} bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed`}>
            {enviando ? 'Importando…' : `Importar ${listas.length} venta${listas.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};
