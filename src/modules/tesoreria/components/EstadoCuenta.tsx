import { useState } from 'react';
import { useErp } from '../../../core/hooks/useErp';
import { Opciones } from '../../../core/components/Opciones';
import { useAccion } from '../../../core/hooks/useAccion';
import { api } from '../../../core/services/api';
import { ruta } from '../../../core/config/navigation';
import { formatFecha, formatMoneda } from '../../../core/utils/format';
import { AvisoFlujo, type Aviso } from '../../../core/components/AvisoFlujo';
import { DataTable, type ColumnaTabla } from '../../../core/components/DataTable';
import { EmptyState } from '../../../core/components/EmptyState';
import { Indicador } from '../../../core/components/Indicador';
import { Insignia } from '../../../core/components/Insignia';
import { Modal } from '../../../core/components/Modal';
import type { CuentaFinanciera } from '../../../core/types';

type Filtro = 'todas' | 'pendientes' | 'canceladas';

/**
 * Tesorería > Por cobrar (lo que los clientes deben, nace al facturar a crédito)
 * Tesorería > Por pagar (lo que se debe a proveedores, nace al recibir una compra a crédito).
 */
export const EstadoCuenta: React.FC<{ tipo: 'Cobrar' | 'Pagar' }> = ({ tipo }) => {
  const { state } = useErp();
  const { enviando, ejecutar } = useAccion();
  const esCobrar = tipo === 'Cobrar';
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [liquidando, setLiquidando] = useState<CuentaFinanciera | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const cuentas = state.cuentas.filter((c) => c.tipo === tipo);
  const visibles = cuentas.filter((c) => filtro === 'todas' || (filtro === 'pendientes' ? c.estado === 'Pendiente' : c.estado === 'Cancelada'));
  const pendientes = cuentas.filter((c) => c.estado === 'Pendiente');
  const saldo = pendientes.reduce((a, c) => a + c.saldo, 0);
  const hoy = new Date().toISOString();

  const tercero = (c: CuentaFinanciera) =>
    (esCobrar
      ? state.clientes.find((x) => x.id === c.terceroId)?.razonSocial
      : state.proveedores.find((x) => x.id === c.terceroId)?.razonSocial) ?? '-';
  const situacion = (c: CuentaFinanciera) => (c.estado === 'Pendiente' && c.vencimiento < hoy ? 'Vencida' : c.estado);

  const confirmar = async () => {
    if (!liquidando) return;
    const cuenta = liquidando;
    const r = await ejecutar(() => api.tesoreria.liquidarCuenta(cuenta.id));
    setAviso(r.ok
      ? {
          ok: true,
          texto: esCobrar
            ? 'Cobro registrado. La factura ya figura como pagada y el dinero entró a Caja.'
            : 'Pago registrado. La recepción ya figura como pagada y el dinero salió de Caja.',
          siguiente: { to: ruta('tesoreria', 'caja'), texto: 'Ver en Caja' },
        }
      : { ok: false, texto: r.error });
    setLiquidando(null);
  };

  const columnas: ColumnaTabla<CuentaFinanciera>[] = [
    { titulo: esCobrar ? 'Factura' : 'Recepción', celda: (c) => c.documentoNumero },
    { titulo: esCobrar ? 'Cliente (a quién se cobra)' : 'Proveedor (a quién se paga)', celda: tercero },
    { titulo: 'Vence', celda: (c) => formatFecha(c.vencimiento) },
    { titulo: 'Monto', celda: (c) => formatMoneda(c.monto), derecha: true },
    { titulo: 'Saldo', celda: (c) => formatMoneda(c.saldo), derecha: true },
    { titulo: 'Situación', celda: (c) => <Insignia texto={situacion(c)} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo={esCobrar ? 'Por cobrar' : 'Por pagar'} valor={formatMoneda(saldo)} nota="Saldo pendiente" />
        <Indicador titulo="Cuentas pendientes" valor={pendientes.length} />
        <Indicador titulo="Cuentas en total" valor={cuentas.length} />
      </div>

      <Opciones<Filtro>
        id="ec-filtro" etiqueta="Mostrar" value={filtro} onChange={setFiltro} tamano="sm"
        opciones={[{ value: 'todas', label: 'Todas' }, { value: 'pendientes', label: 'Pendientes' }, { value: 'canceladas', label: 'Canceladas' }]}
      />

      {aviso && <AvisoFlujo aviso={aviso} onCerrar={() => setAviso(null)} />}

      <DataTable
        columnas={columnas}
        filas={visibles}
        clave={(c) => c.id}
        vacio={
          <EmptyState
            titulo={esCobrar ? 'No hay cuentas por cobrar' : 'No hay cuentas por pagar'}
            descripcion={esCobrar
              ? 'Cada factura emitida abre aquí su cuenta. Las de contado nacen canceladas; las de crédito quedan pendientes de cobro.'
              : 'Cada orden recibida en Kardex abre aquí su cuenta. Las de contado nacen canceladas; las de crédito quedan pendientes de pago.'}
          />
        }
        acciones={(c) => c.estado === 'Pendiente' ? (
          <button onClick={() => { setAviso(null); setLiquidando(c); }}
            className="px-3 py-1.5 rounded-lg text-sm text-teal-700 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            {esCobrar ? 'Registrar cobro' : 'Registrar pago'}
          </button>
        ) : null}
      />

      {liquidando && (
        <Modal titulo={esCobrar ? 'Registrar cobro' : 'Registrar pago'} onCerrar={() => setLiquidando(null)} ancho="sm">
          <p className="text-sm text-slate-600">
            Se {esCobrar ? 'cobrará' : 'pagará'} el saldo completo de {formatMoneda(liquidando.saldo)} a {tercero(liquidando)} por el documento {liquidando.documentoNumero}.
            Se registrará {esCobrar ? 'un ingreso' : 'un egreso'} en Caja.
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setLiquidando(null)}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              Cancelar
            </button>
            <button onClick={confirmar} disabled={enviando}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
              {enviando ? 'Guardando…' : `Confirmar ${esCobrar ? 'cobro' : 'pago'}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
