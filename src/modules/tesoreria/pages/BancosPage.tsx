import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useErp } from '../../../core/hooks/useErp';
import { api } from '../../../core/services/api';
import { saldoCuenta } from '../../../core/services/erpStore';
import { ruta } from '../../../core/config/navigation';
import { formatFechaHora, formatMoneda } from '../../../core/utils/format';
import { AvisoFlujo, type Aviso } from '../../../core/components/AvisoFlujo';
import { DataTable, type ColumnaTabla } from '../../../core/components/DataTable';
import { EmptyState } from '../../../core/components/EmptyState';
import { FiltroFechas, useFiltroFechas } from '../../../core/components/FiltroFechas';
import { Indicador } from '../../../core/components/Indicador';
import { Insignia } from '../../../core/components/Insignia';
import { Modal } from '../../../core/components/Modal';
import { MaestroCrud } from '../../mantenimiento/components/MaestroCrud';
import { CONFIG_CUENTAS } from '../config/cuentasBancarias';
import { FormularioMovimientoBanco } from '../components/FormularioMovimientoBanco';
import type { MovimientoBanco } from '../../../core/types';

export const BancosPage: React.FC = () => {
  const { state } = useErp();
  const filtro = useFiltroFechas();
  const [operando, setOperando] = useState<'Depósito' | 'Retiro' | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const hayBancos = state.bancos.some((b) => b.estado === 'Activo');
  const hayCuentas = state.cuentasBancarias.some((c) => c.estado === 'Activo');
  const saldoEnBancos = state.cuentasBancarias.reduce((a, c) => a + saldoCuenta(state.movimientosBanco, c.id), 0);

  const visibles = state.movimientosBanco.filter((m) => filtro.enRango(m.fecha)).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  const ocultos = state.movimientosBanco.length - state.movimientosBanco.filter((m) => filtro.enRango(m.fecha)).length;
  const depositos = visibles.filter((m) => m.tipo === 'Depósito').reduce((a, m) => a + m.monto, 0);
  const retiros = visibles.filter((m) => m.tipo === 'Retiro').reduce((a, m) => a + m.monto, 0);

  const cuentaDe = (m: MovimientoBanco): string => {
    const c = state.cuentasBancarias.find((x) => x.id === m.cuentaId);
    const banco = state.bancos.find((b) => b.id === c?.bancoId)?.nombre ?? 'Banco';
    return c ? `${banco} ...${c.numero.slice(-4)}` : '-';
  };

  const columnas: ColumnaTabla<MovimientoBanco>[] = [
    { titulo: 'Fecha', celda: (m) => formatFechaHora(m.fecha) },
    { titulo: 'Número', celda: (m) => m.numero },
    { titulo: 'Cuenta', celda: cuentaDe },
    { titulo: 'Tipo', celda: (m) => <Insignia texto={m.tipo} /> },
    { titulo: 'Concepto', celda: (m) => m.concepto },
    { titulo: 'Importe', celda: (m) => (m.tipo === 'Retiro' ? `- ${formatMoneda(m.monto)}` : formatMoneda(m.monto)), derecha: true },
    { titulo: 'Saldo de la cuenta', celda: (m) => formatMoneda(m.saldo), derecha: true },
  ];

  const boton = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500';

  return (
    <div className="space-y-8">
      {!hayBancos && (
        <div role="status" className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Para abrir una cuenta primero debes crear un banco en{' '}
          <Link to={ruta('mantenimiento', 'bancos')} className="underline font-medium">Mantenimiento</Link>.
        </div>
      )}

      <section className="space-y-3" aria-label="Cuentas bancarias">
        <h2 className="font-semibold text-slate-900">Cuentas bancarias</h2>
        <MaestroCrud config={CONFIG_CUENTAS} />
      </section>

      <section className="space-y-4" aria-label="Movimientos bancarios">
        <h2 className="font-semibold text-slate-900">Movimientos</h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <Indicador titulo="Saldo en bancos" valor={formatMoneda(saldoEnBancos)} nota="Todas las cuentas" />
          <Indicador titulo="Depósitos" valor={formatMoneda(depositos)} nota={filtro.esHoy ? 'De hoy' : 'En el período filtrado'} />
          <Indicador titulo="Retiros" valor={formatMoneda(retiros)} />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <FiltroFechas filtro={filtro} />
          <div className="flex gap-2">
            <button disabled={!hayCuentas} onClick={() => { setAviso(null); setOperando('Depósito'); }} className={boton}>
              <ArrowDownToLine className="w-4 h-4" /> Depositar
            </button>
            <button disabled={!hayCuentas} onClick={() => { setAviso(null); setOperando('Retiro'); }} className={boton}>
              <ArrowUpFromLine className="w-4 h-4" /> Retirar
            </button>
          </div>
        </div>

        {aviso && <AvisoFlujo aviso={aviso} onCerrar={() => setAviso(null)} />}

        {ocultos > 0 && !filtro.invalido && (
          <p className="text-sm text-slate-500">
            Hay {ocultos} movimiento{ocultos === 1 ? '' : 's'} fuera del período filtrado.{' '}
            <button onClick={filtro.verTodo} className="text-teal-700 underline">Ver todo</button>
          </p>
        )}

        <DataTable
          columnas={columnas}
          filas={visibles}
          clave={(m) => m.id}
          vacio={
            <EmptyState
              titulo="Sin movimientos bancarios en este período"
              descripcion={hayCuentas
                ? 'Deposita dinero de Caja en la cuenta, o retira para devolverlo a Caja.'
                : 'Primero abre una cuenta bancaria. Luego podrás depositar y retirar.'}
            />
          }
        />
      </section>

      {operando && (
        <Modal titulo={operando === 'Depósito' ? 'Depositar en el banco' : 'Retirar del banco'} onCerrar={() => setOperando(null)}>
          <FormularioMovimientoBanco
            tipo={operando}
            state={state}
            onGuardar={api.tesoreria.movimientoBanco}
            onExito={() => {
              setOperando(null);
              setAviso({
                ok: true,
                texto: operando === 'Depósito'
                  ? 'Depósito registrado. El dinero salió de Caja y entró a la cuenta.'
                  : 'Retiro registrado. El dinero salió de la cuenta y entró a Caja.',
                siguiente: { to: ruta('tesoreria', 'caja'), texto: 'Ver en Caja' },
              });
            }}
            onCancelar={() => setOperando(null)}
          />
        </Modal>
      )}
    </div>
  );
};
