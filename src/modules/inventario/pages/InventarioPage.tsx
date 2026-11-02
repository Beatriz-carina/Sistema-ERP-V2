import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useErp } from '../../../core/hooks/useErp';
import { api } from '../../../core/services/api';
import { Modal } from '../../../core/components/Modal';
import { AvisoFlujo, type Aviso } from '../../../core/components/AvisoFlujo';
import { StockTab } from '../components/StockTab';
import { MovimientosTab } from '../components/MovimientosTab';
import { FormularioAjuste } from '../components/FormularioAjuste';

export const InventarioPage: React.FC = () => {
  const { state } = useErp();
  const [ajustando, setAjustando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => { setAviso(null); setAjustando(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo ajuste
        </button>
      </div>

      {aviso && <AvisoFlujo aviso={aviso} onCerrar={() => setAviso(null)} />}

      <Routes>
        <Route index element={<Navigate to="stock" replace />} />
        <Route path="stock" element={<StockTab />} />
        <Route path="movimientos" element={<MovimientosTab />} />
        <Route path="*" element={<Navigate to="stock" replace />} />
      </Routes>

      {ajustando && (
        <Modal titulo="Nuevo ajuste de inventario" onCerrar={() => setAjustando(false)}>
          <FormularioAjuste
            state={state}
            onGuardar={api.inventario.registrarAjuste}
            onExito={() => { setAjustando(false); setAviso({ ok: true, texto: 'Ajuste registrado. El movimiento ya figura en Movimientos con su saldo.' }); }}
            onCancelar={() => setAjustando(false)}
          />
        </Modal>
      )}
    </div>
  );
};
