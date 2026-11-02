import { useState } from 'react';
import { useErp } from '../../../core/hooks/useErp';
import { saldoDeCaja, sesionAbierta } from '../../../core/services/erpStore';
import { useAccion } from '../../../core/hooks/useAccion';
import { api } from '../../../core/services/api';
import { formatFechaHora, formatMoneda, formatMonedaConSigno } from '../../../core/utils/format';
import { DataTable, type ColumnaTabla } from '../../../core/components/DataTable';
import { EmptyState } from '../../../core/components/EmptyState';
import { FiltroFechas, useFiltroFechas } from '../../../core/components/FiltroFechas';
import { Indicador } from '../../../core/components/Indicador';
import { Insignia } from '../../../core/components/Insignia';
import type { MovimientoCaja } from '../../../core/types';

type FilaCaja = MovimientoCaja & { acumulado: number };

const CLASE_ENTRADA = 'mt-1 w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';
const CLASE_PRIMARIO = 'rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-wait';
const CLASE_SECUNDARIO = 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50';

/** Convierte lo escrito en un número; un campo vacío cuenta como inválido y no como cero. */
const aNumero = (texto: string): number => (texto.trim() === '' ? Number.NaN : Number(texto));

/** Estado de la caja: abrirla con el dinero contado y cerrarla con un arqueo. */
const PanelCaja: React.FC = () => {
  const { state } = useErp();
  const abierta = sesionAbierta(state.sesionesCaja);
  const saldoLibro = saldoDeCaja(state.caja);
  const ultimoCierre = state.sesionesCaja.filter((x) => x.estado === 'Cerrada').slice(-1)[0];

  const [montoApertura, setMontoApertura] = useState<string | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [montoCierre, setMontoCierre] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { enviando, ejecutar } = useAccion();

  const textoApertura = montoApertura ?? saldoLibro.toFixed(2);
  const textoCierre = montoCierre ?? saldoLibro.toFixed(2);
  const contadoCierre = aNumero(textoCierre);
  const diferencia = Number.isFinite(contadoCierre) ? Math.round((contadoCierre - saldoLibro) * 100) / 100 : null;

  const abrir = async (): Promise<void> => {
    const r = await ejecutar(() => api.tesoreria.abrirCaja({ montoInicial: aNumero(textoApertura) }));
    if (r.ok) {
      setError('');
      setMontoApertura(null);
    } else {
      setError(r.error);
    }
  };

  const cerrar = async (): Promise<void> => {
    const r = await ejecutar(() => api.tesoreria.cerrarCaja({ saldoContado: contadoCierre }));
    if (r.ok) {
      setError('');
      setCerrando(false);
      setMontoCierre(null);
    } else {
      setError(r.error);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                abierta ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {abierta ? 'Caja abierta' : 'Caja cerrada'}
            </span>
            {abierta && (
              <span className="text-sm text-slate-500">
                {abierta.numero} · desde {formatFechaHora(abierta.fechaApertura)} · monto inicial {formatMoneda(abierta.montoInicial)}
              </span>
            )}
          </div>
        </div>

        {!abierta && (
          <div className="flex items-end gap-2">
            <label className="text-xs text-slate-500">
              Dinero contado al abrir (S/)
              <input
                type="number"
                min="0"
                step="0.01"
                value={textoApertura}
                onChange={(e) => setMontoApertura(e.target.value)}
                className={`${CLASE_ENTRADA} block`}
              />
            </label>
            <button onClick={abrir} disabled={enviando} className={CLASE_PRIMARIO}>{enviando ? 'Abriendo…' : 'Abrir caja'}</button>
          </div>
        )}

        {abierta && !cerrando && (
          <button onClick={() => { setError(''); setCerrando(true); }} className={CLASE_SECUNDARIO}>Cerrar caja</button>
        )}
      </div>

      {abierta && cerrando && (
        <div className="flex flex-wrap items-end gap-4 border-t border-slate-100 pt-3">
          <div className="text-xs text-slate-500">
            Saldo esperado
            <p className="mt-1 py-2 text-sm font-medium text-slate-900">{formatMoneda(saldoLibro)}</p>
          </div>
          <label className="text-xs text-slate-500">
            Dinero contado (S/)
            <input
              type="number"
              min="0"
              step="0.01"
              value={textoCierre}
              onChange={(e) => setMontoCierre(e.target.value)}
              className={`${CLASE_ENTRADA} block`}
            />
          </label>
          <div className="text-xs text-slate-500">
            Diferencia
            <p
              className={`mt-1 py-2 text-sm font-medium ${
                diferencia === null || diferencia === 0 ? 'text-slate-900' : 'text-amber-700'
              }`}
            >
              {diferencia === null ? '—' : formatMonedaConSigno(diferencia)}
              {diferencia !== null && diferencia > 0 && ' (sobrante)'}
              {diferencia !== null && diferencia < 0 && ' (faltante)'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={cerrar} disabled={enviando} className={CLASE_PRIMARIO}>{enviando ? 'Cerrando…' : 'Confirmar cierre'}</button>
            <button onClick={() => { setCerrando(false); setMontoCierre(null); setError(''); }} className={CLASE_SECUNDARIO}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!abierta && ultimoCierre && (
        <p className="text-xs text-slate-500">
          Último cierre {ultimoCierre.numero}: esperado {formatMoneda(ultimoCierre.saldoEsperado ?? 0)}, contado{' '}
          {formatMoneda(ultimoCierre.saldoContado ?? 0)}, diferencia {formatMonedaConSigno(ultimoCierre.diferencia ?? 0)}.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

export const CajaPage: React.FC = () => {
  const { state } = useErp();
  const filtro = useFiltroFechas();

  // El saldo acumulado se calcula sobre todo el historial; el filtro solo decide qué filas se ven.
  let acumulado = 0;
  const todas: FilaCaja[] = state.caja
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((m) => {
      acumulado += m.tipo === 'Ingreso' ? m.monto : -m.monto;
      return { ...m, acumulado };
    });
  const filas = todas.filter((m) => filtro.enRango(m.fecha));

  // Ingresos y egresos cuentan solo lo operativo: el fondo de apertura y los sobrantes o faltantes
  // de arqueo cambian el saldo pero no son ventas ni pagos.
  const operativas = filas.filter((m) => m.origen === undefined);
  const ingresos = operativas.filter((m) => m.tipo === 'Ingreso').reduce((a, m) => a + m.monto, 0);
  const egresos = operativas.filter((m) => m.tipo === 'Egreso').reduce((a, m) => a + m.monto, 0);
  const ocultos = todas.length - filas.length;

  const columnas: ColumnaTabla<FilaCaja>[] = [
    { titulo: 'Fecha', celda: (m) => formatFechaHora(m.fecha) },
    { titulo: 'Concepto', celda: (m) => m.concepto },
    { titulo: 'Tipo', celda: (m) => <Insignia texto={m.tipo} /> },
    { titulo: 'Importe', celda: (m) => (m.tipo === 'Egreso' ? `- ${formatMoneda(m.monto)}` : formatMoneda(m.monto)), derecha: true },
    { titulo: 'Saldo de caja', celda: (m) => formatMonedaConSigno(m.acumulado), derecha: true },
  ];

  return (
    <div className="space-y-4">
      <PanelCaja />

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Ingresos" valor={formatMoneda(ingresos)} nota={filtro.esHoy ? 'De hoy' : 'En el período filtrado'} />
        <Indicador titulo="Egresos" valor={formatMoneda(egresos)} nota={filtro.esHoy ? 'De hoy' : 'En el período filtrado'} />
        <Indicador titulo="Saldo de caja" valor={formatMonedaConSigno(todas.length ? todas[todas.length - 1].acumulado : 0)} nota="Acumulado total, sin filtro" />
      </div>

      <FiltroFechas filtro={filtro} />

      {ocultos > 0 && !filtro.invalido && (
        <p className="text-sm text-slate-500">
          Hay {ocultos} movimiento{ocultos === 1 ? '' : 's'} fuera del período filtrado.{' '}
          <button onClick={filtro.verTodo} className="text-teal-700 underline">Ver todo</button>
        </p>
      )}

      <DataTable
        columnas={columnas}
        filas={filas}
        clave={(m) => m.id}
        vacio={<EmptyState titulo="Caja sin movimientos en este período" descripcion="Las facturas y compras al contado, y los cobros y pagos de cuentas, se registran aquí." />}
      />
    </div>
  );
};
