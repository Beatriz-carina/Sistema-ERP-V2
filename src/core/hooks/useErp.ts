import { useSyncExternalStore } from 'react';
import { erpStore } from '../services/erpStore';

/**
 * Devuelve los datos del ERP (solo lectura). Se actualiza solo cuando algo cambia, en cualquier módulo.
 * Para guardar algo, las pantallas usan la capa de servicios: `api` (core/services/api.ts).
 */
export function useErp() {
  const state = useSyncExternalStore(erpStore.subscribe, erpStore.getState, erpStore.getState);
  return { state };
}
