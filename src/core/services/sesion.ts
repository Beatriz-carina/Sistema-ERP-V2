/**
 * Sesión del usuario (simulada).
 * Solo guarda QUIÉN inició sesión. La validación del correo y la clave la hace erpStore.iniciarSesion,
 * y cuando exista el backend la hará POST /api/v1/auth (que devolverá un token en vez de la clave de prueba).
 */

const CLAVE_SESION = 'erp-enterprise-cloud:sesion';

/** Contraseña de todos los usuarios mientras el login sea simulado. */
export const CLAVE_DEMO = 'demo123';

function leer(): string | null {
  try {
    return localStorage.getItem(CLAVE_SESION);
  } catch {
    return null;
  }
}

let usuarioId: string | null = leer();
const listeners = new Set<() => void>();

function cambiar(id: string | null): void {
  usuarioId = id;
  try {
    if (id) localStorage.setItem(CLAVE_SESION, id);
    else localStorage.removeItem(CLAVE_SESION);
  } catch {
    /* sin almacenamiento: la sesión dura mientras la pestaña esté abierta */
  }
  listeners.forEach((l) => l());
}

export const sesion = {
  /** Id del usuario conectado, o null si nadie inició sesión. */
  getUsuarioId: (): string | null => usuarioId,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  abrir: (id: string): void => cambiar(id),
  cerrar: (): void => cambiar(null),
};
