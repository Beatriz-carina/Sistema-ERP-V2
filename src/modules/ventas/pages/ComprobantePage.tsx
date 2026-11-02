import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { useErp } from '../../../core/hooks/useErp';
import { ruta } from '../../../core/config/navigation';
import { formatMoneda } from '../../../core/utils/format';
import {
  codigoUnidad, fechaCorta, montoEnLetras, resumenSimulado, textoQr, tipoDocCliente,
} from '../../../core/utils/comprobante';

const num = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Representación impresa de la factura electrónica (simulada).
 * Sigue el formato peruano, pero NO se envía a SUNAT y lleva la marca "SIN VALOR TRIBUTARIO".
 */
export const ComprobantePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { state } = useErp();
  const [qr, setQr] = useState('');

  const venta = state.ventas.find((v) => v.id === id);
  const cliente = state.clientes.find((c) => c.id === venta?.clienteId);
  const empresa = state.empresa;
  const resumen = venta ? resumenSimulado(`${empresa.ruc}|${venta.numero}|${venta.total}|${venta.fecha}`) : '';
  const contenidoQr = venta && cliente
    ? textoQr({
        ruc: empresa.ruc, tipo: '01', numero: venta.numero, igv: venta.igv, total: venta.total, fecha: venta.fecha,
        tipoDocCliente: tipoDocCliente(cliente.tipoDocumento), docCliente: cliente.numeroDocumento, resumen,
      })
    : '';

  useEffect(() => {
    if (!contenidoQr) return;
    QRCode.toDataURL(contenidoQr, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(''));
  }, [contenidoQr]);

  if (!venta || !cliente) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
        El comprobante no existe. <Link to={ruta('ventas', 'facturacion')} className="text-teal-700 underline">Volver a Facturación</Link>
      </div>
    );
  }

  const vendedor = state.vendedores.find((v) => v.id === venta.vendedorId);
  const orden = state.ordenesVenta.find((o) => o.id === venta.ordenId);
  const cotizacion = state.cotizaciones.find((c) => c.id === orden?.cotizacionId);
  const cuenta = state.cuentas.find((c) => c.tipo === 'Cobrar' && c.documentoNumero === venta.numero);
  const credito = venta.condicion === 'Crédito';
  const vence = credito && cuenta ? cuenta.vencimiento : venta.fecha;
  const producto = (pid: string) => state.productos.find((p) => p.id === pid);
  const nombreDe = (lista: { id: string; nombre: string }[], i?: string) => lista.find((x) => x.id === i)?.nombre ?? '';

  const fila = (etiqueta: string, valor: string) => (
    <>
      <span className="font-bold text-slate-700">{etiqueta}</span>
      <span>{valor}</span>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Barra de acciones: no se imprime */}
      <div className="no-imprimir flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          Factura <span className="font-semibold text-slate-900">{venta.numero}</span> emitida ·{' '}
          {venta.estadoPago === 'Pagada'
            ? <span className="text-emerald-700 font-medium">Cobrada</span>
            : <>Pendiente de cobro · <Link to={ruta('tesoreria', 'por-cobrar')} className="text-teal-700 underline">Ir a Por cobrar</Link></>}
        </div>
        <div className="flex gap-2">
          <Link to={ruta('ventas', 'facturacion')}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            Volver a Facturación
          </Link>
          <button onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Hoja A4 */}
      <article className="comprobante relative mx-auto max-w-[794px] overflow-hidden bg-white px-11 py-10 text-[11.5px] text-slate-900 shadow-sm border border-slate-200 [font-family:Arial,Helvetica,sans-serif]">
        <div aria-hidden="true" className="pointer-events-none absolute left-[-60px] top-[440px] w-[920px] -rotate-[28deg] text-center text-[44px] font-bold tracking-wide text-red-600/10">
          DOCUMENTO DE PRUEBA · SIN VALOR TRIBUTARIO
        </div>

        <header className="grid grid-cols-[1fr_250px] items-start gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] bg-teal-600 text-xl font-bold text-white">EC</div>
            <div>
              <p className="text-[17px] font-bold">{empresa.razonSocial}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-700">
                {empresa.rubro}<br />{empresa.direccion} · Tel. {empresa.telefono}<br />{empresa.correo}
              </p>
            </div>
          </div>
          <div className="rounded-lg border-2 border-slate-900 px-2.5 py-3 text-center">
            <p className="text-sm font-bold">R.U.C. {empresa.ruc}</p>
            <p className="-mx-2.5 my-2 bg-slate-900 py-1.5 text-[15px] font-bold text-white">FACTURA ELECTRÓNICA</p>
            <p className="text-[15px] font-bold">{venta.numero}</p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-[150px_1fr_120px_1fr] gap-x-2.5 gap-y-1.5 rounded-lg border border-slate-300 px-3.5 py-3">
          {fila('Fecha de emisión:', fechaCorta(venta.fecha))}
          {fila('Moneda:', 'SOLES (PEN)')}
          {fila('Fecha de vencimiento:', fechaCorta(vence))}
          {fila('Forma de pago:', credito ? 'Crédito' : 'Contado')}
          <span className="font-bold text-slate-700">Señor(es):</span>
          <span className="col-span-3 uppercase">{cliente.razonSocial}</span>
          {fila(`${cliente.tipoDocumento}:`, cliente.numeroDocumento)}
          {fila('Vendedor:', vendedor?.nombre ?? '-')}
          <span className="font-bold text-slate-700">Dirección:</span>
          <span className="col-span-3">{cliente.direccion}</span>
        </section>

        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="w-[52px] border border-slate-300 px-1.5 py-1.5 text-center">Cant.</th>
              <th className="w-[60px] border border-slate-300 px-1.5 py-1.5">Unidad</th>
              <th className="w-[78px] border border-slate-300 px-1.5 py-1.5">Código</th>
              <th className="border border-slate-300 px-1.5 py-1.5">Descripción</th>
              <th className="w-[90px] border border-slate-300 px-1.5 py-1.5 text-right">V. unitario</th>
              <th className="w-[92px] border border-slate-300 px-1.5 py-1.5 text-right">Valor venta</th>
            </tr>
          </thead>
          <tbody>
            {venta.detalle.map((l) => {
              const p = producto(l.productoId);
              const marca = nombreDe(state.marcas, p?.marcaId);
              const garantia = p?.garantiaMeses ?? 0;
              return (
                <tr key={l.productoId} className="align-top">
                  <td className="border border-slate-200 px-1.5 py-2 text-center">{l.cantidad}</td>
                  <td className="border border-slate-200 px-1.5 py-2">{codigoUnidad(nombreDe(state.unidades, p?.unidadId))}</td>
                  <td className="border border-slate-200 px-1.5 py-2">{p?.codigo ?? '-'}</td>
                  <td className="border border-slate-200 px-1.5 py-2">
                    <span className="uppercase">{p?.nombre ?? '-'}</span>
                    {(marca || garantia > 0) && (
                      <span className="mt-0.5 block text-[10.5px] text-slate-500">
                        {[marca && `Marca: ${marca}`, garantia > 0 && `Garantía: ${garantia} meses`].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </td>
                  <td className="border border-slate-200 px-1.5 py-2 text-right tabular-nums">{num(l.precioUnitario)}</td>
                  <td className="border border-slate-200 px-1.5 py-2 text-right tabular-nums">{num(l.subtotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <section className="mt-4 grid grid-cols-[1fr_280px] gap-4">
          <div className="space-y-3.5">
            <p className="rounded-lg border border-slate-300 px-3 py-2.5"><b>SON:</b> {montoEnLetras(venta.total)}</p>
            {credito && (
              <div className="rounded-lg border border-slate-300 px-3 py-2.5">
                <p className="font-bold">Información del crédito</p>
                <table className="mt-1.5 w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      <th className="border border-slate-300 px-1.5 py-1">N° cuota</th>
                      <th className="border border-slate-300 px-1.5 py-1">Fecha de vencimiento</th>
                      <th className="border border-slate-300 px-1.5 py-1 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-200 px-1.5 py-1.5">1</td>
                      <td className="border border-slate-200 px-1.5 py-1.5">{fechaCorta(vence)}</td>
                      <td className="border border-slate-200 px-1.5 py-1.5 text-right tabular-nums">{formatMoneda(venta.total)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-1.5 text-[10.5px] text-slate-500">Monto neto pendiente de pago: {formatMoneda(cuenta?.saldo ?? venta.total)}</p>
              </div>
            )}
          </div>
          <dl className="text-xs">
            {([
              ['Op. gravada', venta.subtotal], ['Op. exonerada', 0], ['Op. inafecta', 0], ['IGV (18%)', venta.igv],
            ] as [string, number][]).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-slate-100 px-2.5 py-1.5">
                <dt>{k}</dt><dd className="tabular-nums">{formatMoneda(v)}</dd>
              </div>
            ))}
            <div className="mt-1 flex justify-between rounded-md bg-slate-900 px-2.5 py-2 text-[13px] font-bold text-white">
              <dt>IMPORTE TOTAL</dt><dd className="tabular-nums">{formatMoneda(venta.total)}</dd>
            </div>
          </dl>
        </section>

        <footer className="mt-5 grid grid-cols-[120px_1fr] items-center gap-4 border-t border-dashed border-slate-400 pt-4">
          {qr
            ? <img src={qr} alt={`Código QR del comprobante ${venta.numero}`} className="h-[120px] w-[120px]" />
            : <div className="h-[120px] w-[120px] rounded border-2 border-dashed border-slate-300" />}
          <p className="text-[10.5px] leading-relaxed text-slate-700">
            <b>Representación impresa de la Factura Electrónica.</b><br />
            Estado: <b>Aceptada (simulado)</b> · Resumen: {resumen} (simulado)<br />
            Emitido desde ERP EnterpriseCloud · Orden de venta {orden?.numero ?? '-'}
            {cotizacion ? ` · Cotización ${cotizacion.numero}` : ''}
          </p>
        </footer>

        <p className="mt-3.5 rounded-md border border-red-200 bg-red-50 py-1.5 text-center text-[11px] font-bold text-red-800">
          DOCUMENTO DE PRUEBA GENERADO POR UN SISTEMA ACADÉMICO · SIN VALOR TRIBUTARIO · NO ENVIADO A SUNAT
        </p>
      </article>
    </div>
  );
};
