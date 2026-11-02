import { useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { useErp } from '../../../core/hooks/useErp';
import { useAccion } from '../../../core/hooks/useAccion';
import { api } from '../../../core/services/api';
import { LIMITE_REGISTROS } from '../../../core/services/erpStore';
import { aCsv, descargarCsv } from '../../../core/utils/csv';
import { Modal } from '../../../core/components/Modal';
import type { ConfigMaestro } from '../config/maestros';
import { analizarCsv, type AnalisisCsv } from '../config/analisisCsv';

interface Props {
  config: ConfigMaestro;
  onImportado: (cantidad: number) => void;
  onCerrar: () => void;
}

export const ImportarCsv: React.FC<Props> = ({ config, onImportado, onCerrar }) => {
  const { state } = useErp();
  const { enviando, ejecutar } = useAccion();
  const [nombre, setNombre] = useState('');
  const [analisis, setAnalisis] = useState<AnalisisCsv | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validas = (analisis?.filas ?? []).filter((f) => f.valores);
  const conError = (analisis?.filas ?? []).filter((f) => !f.valores);
  const excedeLimite = (state[config.coleccion] as unknown[]).length + validas.length > LIMITE_REGISTROS;

  const leer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError(null);
    setNombre(archivo.name);
    try {
      setAnalisis(analizarCsv(await archivo.text(), config, state));
    } catch {
      setAnalisis(null);
      setError('No se pudo leer el archivo.');
    }
  };

  const importar = async () => {
    setError(null);
    const r = await ejecutar(() => api.maestros.importar(config.coleccion, validas.map((f) => f.valores) as never[]));
    if (r.ok) onImportado(validas.length);
    else setError(r.error);
  };

  const plantilla = () => descargarCsv(`plantilla-${config.plural}.csv`, aCsv(config.campos.map((c) => c.etiqueta), []));

  return (
    <Modal titulo={`Importar ${config.plural} desde CSV`} onCerrar={onCerrar}>
      <div className="space-y-5">
        <div className="text-sm text-slate-600 space-y-2">
          <p>Sube un archivo CSV (UTF-8, separado por comas o punto y coma). La primera fila debe llevar estos títulos:</p>
          <p className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-700">
            {config.campos.map((c, i) => (
              <span key={c.clave}>{i > 0 && ' · '}{c.etiqueta}{c.requerido && config.inicial[c.clave] === '' ? ' *' : ''}</span>
            ))}
          </p>
          <p className="text-xs text-slate-500">* obligatorio. Una celda vacía usa el valor por defecto (por ejemplo, Estado = Activo).</p>
          {config.campos.filter((c) => c.tipo === 'buscar' || c.tipo === 'select').map((c) => {
            const nombres = (c.opciones?.(state) ?? []).map((o) => o.label);
            return (
              <p key={c.clave} className="text-xs text-slate-500">
                <strong className="font-medium text-slate-600">{c.etiqueta}</strong> se escribe por nombre y debe existir antes:{' '}
                {nombres.length === 0 ? 'aún no hay ninguno, créalo en Mantenimiento.' : `${nombres.slice(0, 5).join(', ')}${nombres.length > 5 ? '…' : ''}.`}
              </p>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={plantilla}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            <Download className="w-4 h-4" /> Descargar plantilla
          </button>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 cursor-pointer focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2">
            <FileUp className="w-4 h-4" /> Elegir archivo CSV
            <input type="file" accept=".csv,text/csv" onChange={leer} className="sr-only" aria-label="Archivo CSV" />
          </label>
          {nombre && <span className="text-sm text-slate-500">{nombre}</span>}
        </div>

        {analisis?.error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{analisis.error}</p>}

        {analisis && !analisis.error && (
          <div className="space-y-3" role="status">
            <p className="text-sm text-slate-700">
              Se leyeron {analisis.filas.length} fila{analisis.filas.length === 1 ? '' : 's'}:{' '}
              <strong className="text-emerald-700">{validas.length} lista{validas.length === 1 ? '' : 's'}</strong>
              {conError.length > 0 && <> y <strong className="text-red-700">{conError.length} con errores</strong> (se omitirán)</>}.
            </p>
            {analisis.ignoradas.length > 0 && (
              <p className="text-xs text-slate-500">Columnas ignoradas: {analisis.ignoradas.join(', ')}.</p>
            )}
            {conError.length > 0 && (
              <ul className="max-h-48 overflow-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                {conError.slice(0, 8).map((f) => (
                  <li key={f.linea} className="px-3 py-2">
                    <span className="font-medium text-slate-800">Fila {f.linea}:</span>{' '}
                    <span className="text-red-700">{f.errores.join(' ')}</span>
                  </li>
                ))}
                {conError.length > 8 && <li className="px-3 py-2 text-slate-500">…y {conError.length - 8} más.</li>}
              </ul>
            )}
            {excedeLimite && <p className="text-sm text-amber-700">Se superaría el límite de registros permitido.</p>}
          </div>
        )}

        {error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            Cancelar
          </button>
          <button type="button" onClick={importar} disabled={enviando || validas.length === 0 || excedeLimite}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
            {enviando ? 'Importando…' : `Importar ${validas.length} ${validas.length === 1 ? config.singular : config.plural}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};
