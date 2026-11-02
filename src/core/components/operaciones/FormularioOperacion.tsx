import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CondicionPago, ErpState, Resultado } from '../../types';
import { IGV, stockDe } from '../../services/erpStore';
import { formatMoneda } from '../../utils/format';
import { useAccion } from '../../hooks/useAccion';
import { Buscador } from '../Buscador';
import { Opciones } from '../Opciones';

/** Documento que se está registrando. Los dos primeros son del lado de la venta. */
export type Modo = 'cotizacion' | 'orden-venta' | 'orden-compra';

const NOMBRE: Record<Modo, string> = {
  cotizacion: 'cotización',
  'orden-venta': 'orden de venta',
  'orden-compra': 'orden de compra',
};

export interface DatosFormulario {
  terceroId: string;
  vendedorId: string;
  almacenId: string;
  condicion: CondicionPago;
  detalle: { productoId: string; cantidad: number; precioUnitario: number }[];
}

interface LineaForm { productoId: string; cantidad: string; precio: string }

interface Props {
  modo: Modo;
  state: ErpState;
  onGuardar: (datos: DatosFormulario) => Resultado | Promise<Resultado>;
  onExito: () => void;
  onCancelar: () => void;
}

const activos = <T extends { estado: string }>(lista: T[]): T[] => lista.filter((x) => x.estado === 'Activo');
const unico = <T extends { id: string; estado: string }>(lista: T[]): string => {
  const a = activos(lista);
  return a.length === 1 ? a[0].id : '';
};

export const FormularioOperacion: React.FC<Props> = ({ modo, state, onGuardar, onExito, onCancelar }) => {
  const esVenta = modo !== 'orden-compra';
  const terceros = esVenta
    ? activos(state.clientes).map((c) => ({ value: c.id, label: c.razonSocial, detalle: `${c.tipoDocumento} ${c.numeroDocumento}` }))
    : activos(state.proveedores).map((p) => ({ value: p.id, label: p.razonSocial, detalle: `RUC ${p.ruc}` }));
  const opcionesProducto = activos(state.productos).map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}`, detalle: formatMoneda(p.precioVenta) }));
  const productos = activos(state.productos);
  const almacenes = activos(state.almacenes);
  const vendedores = activos(state.vendedores);

  const [terceroId, setTerceroId] = useState(esVenta ? unico(state.clientes) : unico(state.proveedores));
  const [vendedorId, setVendedorId] = useState(unico(state.vendedores));
  const [almacenId, setAlmacenId] = useState(unico(state.almacenes));
  const [condicion, setCondicion] = useState<CondicionPago>('Contado');
  const [lineas, setLineas] = useState<LineaForm[]>([{ productoId: '', cantidad: '1', precio: '' }]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const { enviando, ejecutar } = useAccion();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const precioBase = (productoId: string): string => {
    const p = productos.find((x) => x.id === productoId);
    return p ? String(esVenta ? p.precioVenta : p.precioCompra) : '';
  };

  const cambiarLinea = (i: number, cambios: Partial<LineaForm>) =>
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...cambios } : l)));

  const subtotal = lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precio) || 0), 0);
  const igv = subtotal * IGV;
  const total = subtotal + igv;

  const cliente = esVenta ? state.clientes.find((c) => c.id === terceroId) : undefined;
  const excedeCredito = esVenta && condicion === 'Crédito' && cliente !== undefined && total > cliente.limiteCredito;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: Record<string, string> = {};
    if (!terceroId) nuevos.tercero = `Selecciona un ${esVenta ? 'cliente' : 'proveedor'}.`;
    if (esVenta && !vendedorId) nuevos.vendedor = 'Selecciona un vendedor.';
    if (!almacenId) nuevos.almacen = 'Selecciona un almacén.';

    lineas.forEach((l, i) => {
      const cant = Number(l.cantidad);
      if (!l.productoId) nuevos[`l${i}`] = 'Selecciona un producto.';
      else if (lineas.findIndex((x) => x.productoId === l.productoId) !== i) nuevos[`l${i}`] = 'Este producto ya está en otra línea.';
      else if (!Number.isInteger(cant) || cant <= 0) nuevos[`l${i}`] = 'La cantidad debe ser un entero mayor que cero.';
      else if (!(Number(l.precio) >= 0) || l.precio === '') nuevos[`l${i}`] = 'Ingresa un precio válido.';
    });

    setErrores(nuevos);
    setErrorGeneral(null);
    if (Object.keys(nuevos).length > 0) return;

    const r = await ejecutar(() => onGuardar({
      terceroId, vendedorId, almacenId, condicion,
      detalle: lineas.map((l) => ({ productoId: l.productoId, cantidad: Number(l.cantidad), precioUnitario: Number(l.precio) })),
    }));
    if (r.ok) onExito();
    else setErrorGeneral(r.error);
  };

  const base = 'w-full rounded-lg border px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-teal-500/20';
  const clase = (k: string) => `${base} ${errores[k] ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-teal-500'}`;
  const etiqueta = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="op-tercero" className={etiqueta}>{esVenta ? 'Cliente' : 'Proveedor'}</label>
          <Buscador
            id="op-tercero" value={terceroId} onChange={setTerceroId} opciones={terceros}
            placeholder={esVenta ? 'Buscar cliente por nombre o documento' : 'Buscar proveedor por nombre o RUC'}
            claseInput={clase('tercero')}
          />
          {errores.tercero && <p className="text-xs text-red-600 mt-1">{errores.tercero}</p>}
        </div>

        {esVenta && (
          <div>
            <label htmlFor="op-vendedor" className={etiqueta}>Vendedor</label>
            <Buscador
              id="op-vendedor" value={vendedorId} onChange={setVendedorId} placeholder="Buscar vendedor"
              opciones={vendedores.map((v) => ({ value: v.id, label: v.nombre, detalle: `DNI ${v.documento}` }))}
              claseInput={clase('vendedor')}
            />
            {errores.vendedor && <p className="text-xs text-red-600 mt-1">{errores.vendedor}</p>}
          </div>
        )}

        <div>
          <label htmlFor="op-almacen" className={etiqueta}>{esVenta ? 'Almacén de salida' : 'Almacén de destino'}</label>
          <Buscador
            id="op-almacen" value={almacenId} onChange={setAlmacenId} placeholder="Buscar almacén"
            opciones={almacenes.map((a) => ({ value: a.id, label: a.nombre, detalle: a.direccion }))}
            claseInput={clase('almacen')}
          />
          {errores.almacen && <p className="text-xs text-red-600 mt-1">{errores.almacen}</p>}
        </div>

        <div>
          <span className={etiqueta}>Condición de pago</span>
          <Opciones<CondicionPago>
            id="op-condicion" etiqueta="Condición de pago" value={condicion} onChange={setCondicion}
            opciones={[{ value: 'Contado', label: 'Contado' }, { value: 'Crédito', label: 'Crédito 30 días' }]}
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700 mb-2">Productos</legend>
        {lineas.map((l, i) => {
          const disponible = l.productoId && almacenId ? stockDe(state.movimientos, l.productoId, almacenId) : null;
          const cant = Number(l.cantidad) || 0;
          const importe = cant * (Number(l.precio) || 0);
          const noAlcanza = esVenta && disponible !== null && disponible < cant;
          return (
            <div key={i} className="rounded-xl border border-slate-200 p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_6rem_8rem_7rem_auto] items-end">
                <div>
                  <label htmlFor={`op-prod-${i}`} className="block text-xs text-slate-500 mb-1">Producto</label>
                  <Buscador
                    id={`op-prod-${i}`} value={l.productoId} opciones={opcionesProducto}
                    onChange={(v) => cambiarLinea(i, { productoId: v, precio: precioBase(v) })}
                    placeholder="Código o nombre" claseInput={clase(`l${i}`)}
                  />
                </div>
                <div>
                  <label htmlFor={`op-cant-${i}`} className="block text-xs text-slate-500 mb-1">Cantidad</label>
                  <input id={`op-cant-${i}`} type="number" min={1} step={1} value={l.cantidad}
                    onChange={(e) => cambiarLinea(i, { cantidad: e.target.value })} className={clase(`l${i}`)} />
                </div>
                <div>
                  <label htmlFor={`op-precio-${i}`} className="block text-xs text-slate-500 mb-1">Precio unitario</label>
                  <input id={`op-precio-${i}`} type="number" min={0} step="any" value={l.precio}
                    onChange={(e) => cambiarLinea(i, { precio: e.target.value })} className={clase(`l${i}`)} />
                </div>
                <p className="text-sm text-slate-700 tabular-nums sm:text-right pb-2">{formatMoneda(importe)}</p>
                <button type="button" aria-label="Quitar producto" disabled={lineas.length === 1}
                  onClick={() => setLineas((ls) => ls.filter((_, idx) => idx !== i))}
                  className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {errores[`l${i}`] && <p className="text-xs text-red-600 mt-2">{errores[`l${i}`]}</p>}
              {disponible !== null && (
                <p className={`text-xs mt-2 ${noAlcanza ? 'text-amber-700' : 'text-slate-500'}`}>
                  Stock en el almacén: {disponible}
                  {noAlcanza && '. Hoy no alcanza: antes de facturar, recibe una compra en Kardex.'}
                </p>
              )}
            </div>
          );
        })}
        <button type="button" disabled={lineas.length >= productos.length}
          onClick={() => setLineas((ls) => [...ls, { productoId: '', cantidad: '1', precio: '' }])}
          className="inline-flex items-center gap-2 text-sm text-teal-700 hover:text-teal-800 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded">
          <Plus className="w-4 h-4" /> Agregar otro producto
        </button>
      </fieldset>

      <dl className="ml-auto w-full sm:w-72 space-y-1 text-sm">
        <div className="flex justify-between text-slate-600"><dt>Subtotal</dt><dd className="tabular-nums">{formatMoneda(subtotal)}</dd></div>
        <div className="flex justify-between text-slate-600"><dt>IGV ({Math.round(IGV * 100)}%)</dt><dd className="tabular-nums">{formatMoneda(igv)}</dd></div>
        <div className="flex justify-between pt-2 border-t border-slate-200 font-semibold text-slate-900"><dt>Total</dt><dd className="tabular-nums">{formatMoneda(total)}</dd></div>
      </dl>

      {excedeCredito && cliente && (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          El total supera el límite de crédito del cliente ({formatMoneda(cliente.limiteCredito)}). Cambia a contado o reduce el monto.
        </p>
      )}
      {errorGeneral && (
        <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{errorGeneral}</p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
          Cancelar
        </button>
        <button type="submit" disabled={enviando}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
          {enviando ? 'Guardando…' : `Registrar ${NOMBRE[modo]}`}
        </button>
      </div>
    </form>
  );
};
