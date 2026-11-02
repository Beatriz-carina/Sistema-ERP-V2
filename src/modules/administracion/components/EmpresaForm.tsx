import { useState } from 'react';
import { useErp } from '../../../core/hooks/useErp';
import { useAccion } from '../../../core/hooks/useAccion';
import { api } from '../../../core/services/api';
import type { Empresa } from '../../../core/types';

const CAMPOS: { clave: keyof Empresa; etiqueta: string; completo?: boolean }[] = [
  { clave: 'razonSocial', etiqueta: 'Razón social', completo: true },
  { clave: 'ruc', etiqueta: 'RUC' },
  { clave: 'telefono', etiqueta: 'Teléfono' },
  { clave: 'rubro', etiqueta: 'Rubro', completo: true },
  { clave: 'direccion', etiqueta: 'Dirección', completo: true },
  { clave: 'correo', etiqueta: 'Correo', completo: true },
];

/** Datos de la empresa que se imprimen en el encabezado de cada comprobante. */
export const EmpresaForm: React.FC = () => {
  const { state } = useErp();
  const { enviando, ejecutar } = useAccion();
  const [datos, setDatos] = useState<Empresa>(state.empresa);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await ejecutar(() => api.administracion.actualizarEmpresa(datos));
    setAviso(r.ok ? { ok: true, texto: 'Datos de la empresa guardados.' } : { ok: false, texto: r.error });
  };

  const campo = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

  return (
    <form onSubmit={guardar} noValidate className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-slate-900">Empresa emisora</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map((c) => (
          <div key={c.clave} className={c.completo ? 'sm:col-span-2' : ''}>
            <label htmlFor={`emp-${c.clave}`} className="block text-sm font-medium text-slate-700 mb-1">{c.etiqueta}</label>
            <input id={`emp-${c.clave}`} value={datos[c.clave]} className={campo}
              onChange={(e) => { setDatos({ ...datos, [c.clave]: e.target.value }); setAviso(null); }} />
          </div>
        ))}
      </div>
      {aviso && (
        <p role="status" className={`text-sm rounded-lg px-3 py-2 border ${aviso.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {aviso.texto}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={enviando}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
          {enviando ? 'Guardando…' : 'Guardar datos'}
        </button>
      </div>
    </form>
  );
};
