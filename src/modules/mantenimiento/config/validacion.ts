import type { Campo } from './maestros';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCampo(c: Campo, valor: string, todos: Record<string, string>): string | null {
  if (c.requerido && valor.trim() === '') return 'Este campo es obligatorio.';
  if (c.tipo === 'correo' && !CORREO.test(valor)) return 'Ingresa un correo válido.';
  if (c.tipo === 'numero' && !(Number.isFinite(Number(valor)) && Number(valor) >= 0)) return 'Ingresa un número mayor o igual a cero.';
  return c.validar ? c.validar(valor, todos) : null;
}
