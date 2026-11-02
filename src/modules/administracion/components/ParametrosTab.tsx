import { useState } from 'react';
import { useAccion } from '../../../core/hooks/useAccion';
import { API_MODE, api } from '../../../core/services/api';
import { BUCKET_S3, DIAS_CREDITO, IGV, LIMITE_REGISTROS } from '../../../core/services/erpStore';
import { Modal } from '../../../core/components/Modal';
import { EmpresaForm } from './EmpresaForm';

export const ParametrosTab: React.FC = () => {
  const { enviando, ejecutar } = useAccion();
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState(false);

  const parametros: [string, string][] = [
    ['IGV', `${Math.round(IGV * 100)} %`],
    ['Moneda base', 'Soles (PEN)'],
    ['Plazo de crédito', `${DIAS_CREDITO} días`],
    ['Límite de registros por tabla', Number.isFinite(LIMITE_REGISTROS) ? `${LIMITE_REGISTROS} (versión de demostración)` : 'Sin límite'],
    ['Origen de los datos', API_MODE === 'mock' ? 'Simulado en el navegador (VITE_API_MODE=mock)' : 'Backend FastAPI (VITE_API_MODE=http)'],
    ['Repositorio de documentos', `${BUCKET_S3} (simulado)`],
    ['Persistencia de datos', 'Navegador (se borra al limpiar la caché)'],
  ];

  return (
    <div className="space-y-6">
      <EmpresaForm />

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {parametros.map(([nombre, valor]) => (
          <div key={nombre} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm">
            <span className="text-slate-500">{nombre}</span>
            <span className="font-medium text-slate-800">{valor}</span>
          </div>
        ))}
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-semibold text-slate-900">Datos de demostración</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Borra las compras, ventas, movimientos y demás operaciones, y vuelve a los datos maestros iniciales. Úsalo para repetir la demostración desde cero.
        </p>
        {aviso && <p role="status" className="mt-3 text-sm text-emerald-700">Datos restablecidos.</p>}
        <button
          onClick={() => { setAviso(false); setConfirmando(true); }}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Restablecer datos
        </button>
      </section>

      {confirmando && (
        <Modal titulo="Restablecer datos" onCerrar={() => setConfirmando(false)} ancho="sm">
          <p className="text-sm text-slate-600">Se perderán todas las operaciones registradas. Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2 mt-6">
            <button onClick={() => setConfirmando(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              Cancelar
            </button>
            <button disabled={enviando}
              onClick={async () => { const r = await ejecutar(() => api.administracion.restablecer()); setConfirmando(false); setAviso(r.ok); }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
              {enviando ? 'Restableciendo…' : 'Restablecer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
