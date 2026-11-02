import { useCallback, useRef, useState } from 'react';
import type { Resultado } from '../types';

/**
 * Ejecuta una operación de la API y avisa mientras se guarda.
 * - `enviando` sirve para desactivar el botón y mostrar "Guardando…".
 * - Bloquea el doble clic: si ya hay una operación en curso, la segunda no se envía.
 */
export function useAccion() {
  const ocupado = useRef(false);
  const [enviando, setEnviando] = useState(false);

  const ejecutar = useCallback(async (operacion: () => Resultado | Promise<Resultado>): Promise<Resultado> => {
    if (ocupado.current) return { ok: false, error: 'Espera: todavía se está guardando la operación anterior.' };
    ocupado.current = true;
    setEnviando(true);
    try {
      return await operacion();
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Ocurrió un error inesperado.' };
    } finally {
      ocupado.current = false;
      setEnviando(false);
    }
  }, []);

  return { enviando, ejecutar };
}
