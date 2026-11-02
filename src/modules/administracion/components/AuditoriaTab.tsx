import { useState } from 'react';
import { useErp } from '../../../core/hooks/useErp';
import { formatFechaHora } from '../../../core/utils/format';
import { DataTable, type ColumnaTabla } from '../../../core/components/DataTable';
import { EmptyState } from '../../../core/components/EmptyState';
import { Insignia } from '../../../core/components/Insignia';
import { Opciones } from '../../../core/components/Opciones';
import type { Auditoria } from '../../../core/types';

export const AuditoriaTab: React.FC = () => {
  const { state } = useErp();
  const [modulo, setModulo] = useState('');
  const [resultado, setResultado] = useState('');

  const modulos = Array.from(new Set(state.auditoria.map((a) => a.modulo))).sort();
  const filas = state.auditoria
    .filter((a) => (modulo === '' || a.modulo === modulo) && (resultado === '' || a.resultado === resultado))
    .slice()
    .reverse();

  const columnas: ColumnaTabla<Auditoria>[] = [
    { titulo: 'Fecha', celda: (a) => formatFechaHora(a.fecha) },
    { titulo: 'Usuario', celda: (a) => a.usuario },
    { titulo: 'Módulo', celda: (a) => a.modulo },
    { titulo: 'Acción', celda: (a) => a.accion },
    { titulo: 'Registro', celda: (a) => a.registroId },
    { titulo: 'Resultado', celda: (a) => <Insignia texto={a.resultado} /> },
    { titulo: 'Detalle', celda: (a) => a.detalle ?? '' },
  ];

  const campo = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="aud-modulo" className="block text-xs text-slate-500 mb-1">Módulo</label>
          <select id="aud-modulo" value={modulo} onChange={(e) => setModulo(e.target.value)} className={campo}>
            <option value="">Todos</option>
            {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <span className="block text-xs text-slate-500 mb-1">Resultado</span>
          <Opciones
            id="aud-resultado" etiqueta="Resultado" value={resultado} onChange={setResultado}
            opciones={[{ value: '', label: 'Todos' }, { value: 'Exitoso', label: 'Exitoso' }, { value: 'Rechazado', label: 'Rechazado' }]}
          />
        </div>
        <p className="text-sm text-slate-500 pb-2">{filas.length} de {state.auditoria.length} eventos</p>
      </div>
      <DataTable
        columnas={columnas}
        filas={filas}
        clave={(a) => a.id}
        vacio={<EmptyState titulo="Sin eventos" descripcion="Cada acción crítica del sistema, aceptada o rechazada, queda registrada aquí." />}
      />
    </div>
  );
};
