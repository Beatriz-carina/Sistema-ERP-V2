import { useState } from 'react';
import { useAccion } from '../../hooks/useAccion';
import type { Resultado } from '../../types';
import { Modal } from '../Modal';

interface Props {
  /** Por ejemplo "cotización COT-0002". */
  documento: string;
  onAnular: (motivo: string) => Promise<Resultado>;
  onExito: () => void;
  onCerrar: () => void;
}

/** Confirma la anulación de un documento pendiente y pide el motivo (queda en la auditoría). */
export const ModalAnular: React.FC<Props> = ({ documento, onAnular, onExito, onCerrar }) => {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const { enviando, ejecutar } = useAccion();

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await ejecutar(() => onAnular(motivo));
    if (r.ok) onExito();
    else setError(r.error);
  };

  return (
    <Modal titulo={`Anular ${documento}`} onCerrar={onCerrar} ancho="sm">
      <form onSubmit={confirmar} noValidate className="space-y-4">
        <div>
          <label htmlFor="anular-motivo" className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
          <textarea
            id="anular-motivo" rows={3} value={motivo} autoFocus
            onChange={(e) => { setMotivo(e.target.value); setError(''); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
            Volver
          </button>
          <button type="submit" disabled={enviando}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
            {enviando ? 'Anulando…' : 'Anular'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
