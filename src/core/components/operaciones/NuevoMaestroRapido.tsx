import { useEffect, useState } from 'react';
import type { ColeccionMaestra } from '../../types';
import { api } from '../../services/api';
import { useErp } from '../../hooks/useErp';
import { useAccion } from '../../hooks/useAccion';
import { Modal } from '../Modal';
import { MAESTROS, type Valores } from '../../../modules/mantenimiento/config/maestros';
import { FormularioMaestro } from '../../../modules/mantenimiento/components/FormularioMaestro';

interface Props {
  /** Qué se crea: cliente, proveedor, producto… Cualquier maestro de Mantenimiento sirve. */
  coleccion: ColeccionMaestra;
  /** Se llama al guardar, con el id nuevo y lo que se escribió, para dejarlo elegido en el formulario de origen. */
  onCreado: (id: string, valores: Valores) => void;
  onCerrar: () => void;
}

/**
 * Crea un registro maestro sin salir de la pantalla de trabajo (por ejemplo, un cliente en plena venta).
 * Reutiliza el formulario y las validaciones de Mantenimiento: no hay reglas duplicadas.
 */
export const NuevoMaestroRapido: React.FC<Props> = ({ coleccion, onCreado, onCerrar }) => {
  const { state } = useErp();
  const { enviando, ejecutar } = useAccion();
  const [error, setError] = useState<string | null>(null);
  const config = MAESTROS.find((m) => m.coleccion === coleccion);

  // Esc cierra solo esta ventana y no la de la operación que está debajo.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if ((e.target as HTMLElement | null)?.getAttribute?.('aria-expanded') === 'true') return; // deja cerrar la lista del buscador
      e.stopPropagation();
      onCerrar();
    };
    document.addEventListener('keydown', alTeclear, true);
    return () => document.removeEventListener('keydown', alTeclear, true);
  }, [onCerrar]);

  if (!config) return null;

  const guardar = async (valores: Valores) => {
    setError(null);
    const r = await ejecutar(() => api.maestros.crear(coleccion, valores as never));
    if (r.ok) onCreado(r.id, valores);
    else setError(r.error);
  };

  return (
    <Modal titulo={`${config.genero === 'f' ? 'Nueva' : 'Nuevo'} ${config.singular}`} onCerrar={onCerrar}>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</p>
      )}
      <FormularioMaestro
        config={config} state={state} inicial={config.inicial} esEdicion={false}
        onGuardar={guardar} onCancelar={onCerrar} enviando={enviando}
      />
    </Modal>
  );
};
