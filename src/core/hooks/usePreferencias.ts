import { useSyncExternalStore } from 'react';

/**
 * Preferencias de pantalla de este navegador. No son datos del negocio, por eso viven fuera de erpStore:
 * "Restablecer datos" no las borra y el backend no tiene que conocerlas.
 * Para sumar una preferencia nueva: agrégala a `Preferencias` y a `POR_DEFECTO`.
 */
export interface Preferencias {
  /** Barra de pasos (Cotización → Orden → Factura → Cobro) en Ventas y Compras. */
  guiaPasos: boolean;
}

const CLAVE = 'erp.preferencias';
const POR_DEFECTO: Preferencias = { guiaPasos: true };

const leer = (): Preferencias => {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? { ...POR_DEFECTO, ...JSON.parse(crudo) } : POR_DEFECTO;
  } catch {
    return POR_DEFECTO;
  }
};

let actuales: Preferencias = leer();
const oyentes = new Set<() => void>();

export function cambiarPreferencia<K extends keyof Preferencias>(clave: K, valor: Preferencias[K]): void {
  actuales = { ...actuales, [clave]: valor };
  try { localStorage.setItem(CLAVE, JSON.stringify(actuales)); } catch { /* sin almacenamiento: queda solo en memoria */ }
  oyentes.forEach((f) => f());
}

const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f); }; };

export function usePreferencias() {
  const prefs = useSyncExternalStore(suscribir, () => actuales, () => actuales);
  return { prefs, cambiar: cambiarPreferencia };
}
