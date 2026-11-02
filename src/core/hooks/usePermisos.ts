import { useSyncExternalStore } from 'react';
import { sesion } from '../services/sesion';
import { useErp } from './useErp';

/** Usuario que inició sesión, su rol y qué módulos puede abrir. */
export function usePermisos() {
  const { state } = useErp();
  const usuarioId = useSyncExternalStore(sesion.subscribe, sesion.getUsuarioId, sesion.getUsuarioId);
  const usuario = state.usuarios.find((u) => u.id === usuarioId && u.estado === 'Activo');
  const rol = state.roles.find((r) => r.id === usuario?.rolId);
  const puede = (ruta: string): boolean =>
    !!usuario && (ruta === 'dashboard' || (rol?.permisos.includes(ruta) ?? false));
  return { usuario, rol, puede, conectado: !!usuario };
}
