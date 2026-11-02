import { useState } from 'react';
import type { ErpState, Resultado } from '../../../core/types';
import { saldoCuenta, saldoDeCaja, type DatosMovimientoBanco } from '../../../core/services/erpStore';
import { formatMoneda } from '../../../core/utils/format';
import { useAccion } from '../../../core/hooks/useAccion';

interface Props {
  tipo: 'Depósito' | 'Retiro';
  state: ErpState;
  onGuardar: (d: DatosMovimientoBanco) => Resultado | Promise<Resultado>;
  onExito: () => void;
  onCancelar: () => void;
}

export const FormularioMovimientoBanco: React.FC<Props> = ({ tipo, state, onGuardar, onExito, onCancelar }) => {
  const esDeposito = tipo === 'Depósito';
  const { enviando, ejecutar } = useAccion();
  const cuentas = state.cuentasBancarias.filter((c) => c.estado === 'Activo');
  const [cuentaId, setCuentaId] = useState(cuentas.length === 1 ? cuentas[0].id : '');
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const etiquetaCuenta = (id: string): string => {
    const c = state.cuentasBancarias.find((x) => x.id === id);
    const banco = state.bancos.find((b) => b.id === c?.bancoId)?.nombre ?? 'Banco';
    return c ? `${banco} ...${c.numero.slice(-4)} (${c.tipo})` : '';
  };

  const disponible = esDeposito
    ? saldoDeCaja(state.caja)
    : cuentaId ? saldoCuenta(state.movimientosBanco, cuentaId) : null;

  const campo = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
  const etiqueta = 'block text-sm font-medium text-slate-700 mb-1';

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await ejecutar(() => onGuardar({ cuentaId, tipo, monto: Number(monto), concepto }));
    if (r.ok) onExito();
    else setError(r.error);
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        {esDeposito
          ? 'El dinero sale de Caja y entra a la cuenta bancaria.'
          : 'El dinero sale de la cuenta bancaria y entra a Caja.'}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="mb-cuenta" className={etiqueta}>Cuenta bancaria</label>
          <select id="mb-cuenta" value={cuentaId} onChange={(e) => { setCuentaId(e.target.value); setError(null); }} className={campo}>
            <option value="">Selecciona una opción</option>
            {cuentas.map((c) => <option key={c.id} value={c.id}>{etiquetaCuenta(c.id)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mb-monto" className={etiqueta}>Monto (S/)</label>
          <input id="mb-monto" type="number" min={0} step="any" value={monto}
            onChange={(e) => { setMonto(e.target.value); setError(null); }} className={campo} />
        </div>
        <div>
          <label htmlFor="mb-concepto" className={etiqueta}>Concepto (opcional)</label>
          <input id="mb-concepto" type="text" value={concepto} onChange={(e) => setConcepto(e.target.value)} className={campo} />
        </div>
      </div>

      {disponible !== null && (
        <p className="text-sm text-slate-500">
          {esDeposito ? 'Disponible en Caja' : 'Saldo de la cuenta'}: {formatMoneda(disponible)}
        </p>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
          Cancelar
        </button>
        <button type="submit" disabled={enviando}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
          {enviando ? 'Guardando…' : esDeposito ? 'Registrar depósito' : 'Registrar retiro'}
        </button>
      </div>
    </form>
  );
};
