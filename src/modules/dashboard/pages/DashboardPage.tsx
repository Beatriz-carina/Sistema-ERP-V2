import { Link } from 'react-router-dom';
import { useErp } from '../../../core/hooks/useErp';
import { sesionAbierta, stockDe } from '../../../core/services/erpStore';
import { ERP_BASE } from '../../../core/config/navigation';
import { formatFechaHora, formatMoneda } from '../../../core/utils/format';
import { Indicador } from '../../../core/components/Indicador';
import { Insignia } from '../../../core/components/Insignia';

interface Alerta { clave: string; texto: string; ruta: string; critica: boolean }

const suma = (nums: number[]): number => nums.reduce((a, n) => a + n, 0);

export const DashboardPage: React.FC = () => {
  const { state } = useErp();
  const hoy = new Date().toISOString();

  const ventas = state.ventas.filter((v) => v.estado === 'Emitida');
  const compras = state.compras.filter((c) => c.estado === 'Recibida');
  const totalVentas = suma(ventas.map((v) => v.total));
  const totalCompras = suma(compras.map((c) => c.total));
  const utilidad = suma(ventas.flatMap((v) => v.detalle.map((l) => {
    const costo = state.productos.find((p) => p.id === l.productoId)?.precioCompra ?? l.precioUnitario;
    return l.cantidad * (l.precioUnitario - costo);
  })));

  const ingresos = suma(state.caja.filter((m) => m.tipo === 'Ingreso').map((m) => m.monto));
  const egresos = suma(state.caja.filter((m) => m.tipo === 'Egreso').map((m) => m.monto));
  const pendientes = state.cuentas.filter((c) => c.estado === 'Pendiente');
  const porCobrar = suma(pendientes.filter((c) => c.tipo === 'Cobrar').map((c) => c.saldo));
  const porPagar = suma(pendientes.filter((c) => c.tipo === 'Pagar').map((c) => c.saldo));
  const cajaAbierta = sesionAbierta(state.sesionesCaja);

  const alertas: Alerta[] = [];
  for (const p of state.productos) {
    for (const a of state.almacenes) {
      const stock = stockDe(state.movimientos, p.id, a.id);
      if (stock <= p.stockMinimo) {
        alertas.push({
          clave: `stock-${p.id}-${a.id}`, ruta: 'inventario/stock', critica: stock === 0,
          texto: `${p.nombre} en ${a.nombre}: ${stock === 0 ? 'sin stock' : `stock bajo (${stock}, mínimo ${p.stockMinimo})`}`,
        });
      }
    }
  }
  for (const c of pendientes.filter((x) => x.vencimiento < hoy)) {
    alertas.push({
      clave: `venc-${c.id}`, ruta: c.tipo === 'Cobrar' ? 'tesoreria/por-cobrar' : 'tesoreria/por-pagar', critica: true,
      texto: `Cuenta por ${c.tipo === 'Cobrar' ? 'cobrar' : 'pagar'} vencida: ${c.documentoNumero}`,
    });
  }

  // Caja: con la caja cerrada, los documentos al contado no se pueden procesar.
  const alContado = state.ordenesVenta.filter((o) => o.estado === 'Pendiente' && o.condicion === 'Contado').length
    + state.ordenesCompra.filter((o) => o.estado === 'Pendiente' && o.condicion === 'Contado').length;
  if (!cajaAbierta && alContado > 0) {
    alertas.push({
      clave: 'caja-cerrada', ruta: 'tesoreria/caja', critica: false,
      texto: `Caja cerrada: ${alContado} documento${alContado === 1 ? '' : 's'} al contado ${alContado === 1 ? 'espera' : 'esperan'} que abras la caja`,
    });
  }
  if (cajaAbierta && new Date(cajaAbierta.fechaApertura).toDateString() !== new Date().toDateString()) {
    alertas.push({
      clave: 'caja-vieja', ruta: 'tesoreria/caja', critica: false,
      texto: `La caja ${cajaAbierta.numero} sigue abierta desde ${formatFechaHora(cajaAbierta.fechaApertura)}: ciérrala con un arqueo`,
    });
  }

  // Documentos que esperan una acción en el flujo
  for (const c of state.cotizaciones.filter((x) => x.estado === 'Pendiente')) {
    alertas.push({ clave: `cot-${c.id}`, ruta: 'ventas/cotizaciones', critica: false, texto: `Cotización ${c.numero} por aceptar` });
  }
  for (const o of state.ordenesVenta.filter((x) => x.estado === 'Pendiente')) {
    alertas.push({ clave: `ov-${o.id}`, ruta: 'ventas/facturacion', critica: false, texto: `Orden de venta ${o.numero} por facturar` });
  }
  for (const o of state.ordenesCompra.filter((x) => x.estado === 'Pendiente')) {
    alertas.push({ clave: `oc-${o.id}`, ruta: 'compras/kardex', critica: false, texto: `Orden de compra ${o.numero} por recibir en Kardex` });
  }

  const actividad = state.auditoria.slice().reverse().slice(0, 6);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Indicador titulo="Ventas" valor={formatMoneda(totalVentas)} nota={`${ventas.length} facturadas, IGV incluido`} />
        <Indicador titulo="Compras" valor={formatMoneda(totalCompras)} nota={`${compras.length} recibidas en Kardex, IGV incluido`} />
        <Indicador titulo="Utilidad bruta" valor={formatMoneda(utilidad)} nota="Ventas sin IGV menos costo de lo vendido" />
        <Indicador titulo="Saldo de caja" valor={formatMoneda(ingresos - egresos)} nota={`Ingresos menos egresos · ${cajaAbierta ? `caja abierta (${cajaAbierta.numero})` : 'caja cerrada'}`} />
        <Indicador titulo="Por cobrar" valor={formatMoneda(porCobrar)} nota="Saldo pendiente de clientes" />
        <Indicador titulo="Por pagar" valor={formatMoneda(porPagar)} nota="Saldo pendiente a proveedores" />
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Alertas</h2>
        {alertas.length === 0 ? (
          <p className="text-sm text-slate-500">Sin alertas. El stock y las cuentas están en orden.</p>
        ) : (
          <ul className="space-y-2">
            {alertas.map((a) => (
              <li key={a.clave} className="flex items-start gap-2 text-sm">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${a.critica ? 'bg-red-500' : 'bg-amber-500'}`} />
                <span className="text-slate-700">
                  {a.texto}{' '}
                  <Link to={`${ERP_BASE}/${a.ruta}`} className="text-teal-700 underline">Ver</Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>


      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Actividad reciente</h2>
        {actividad.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay actividad registrada.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {actividad.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-slate-700">{e.modulo}: {e.accion} <span className="text-slate-400">({e.registroId})</span></span>
                <span className="flex items-center gap-3">
                  <Insignia texto={e.resultado} />
                  <span className="text-xs text-slate-400">{formatFechaHora(e.fecha)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
