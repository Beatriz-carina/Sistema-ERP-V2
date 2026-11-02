import { useState } from 'react';
import type { ErpState } from '../../../core/types';
import type { Campo, ConfigMaestro, Valores } from '../config/maestros';
import { Buscador } from '../../../core/components/Buscador';
import { Opciones } from '../../../core/components/Opciones';

interface Props {
  config: ConfigMaestro;
  state: ErpState;
  inicial: Valores;
  esEdicion: boolean;
  onGuardar: (valores: Valores) => void;
  onCancelar: () => void;
  /** true mientras se guarda: desactiva el botón para evitar el doble registro. */
  enviando?: boolean;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarCampo(c: Campo, valor: string, todos: Record<string, string>): string | null {
  if (c.requerido && valor.trim() === '') return 'Este campo es obligatorio.';
  if (c.tipo === 'correo' && !CORREO.test(valor)) return 'Ingresa un correo válido.';
  if (c.tipo === 'numero' && !(Number.isFinite(Number(valor)) && Number(valor) >= 0)) return 'Ingresa un número mayor o igual a cero.';
  return c.validar ? c.validar(valor, todos) : null;
}

export const FormularioMaestro: React.FC<Props> = ({ config, state, inicial, esEdicion, onGuardar, onCancelar, enviando = false }) => {
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(config.campos.map((c) => [c.clave, String(inicial[c.clave] ?? '')])),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});

  const cambiar = (clave: string, valor: string) => {
    setValores((v) => ({ ...v, [clave]: valor }));
    if (errores[clave]) {
      setErrores((e) => {
        const copia = { ...e };
        delete copia[clave];
        return copia;
      });
    }
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: Record<string, string> = {};
    for (const c of config.campos) {
      const err = validarCampo(c, valores[c.clave], valores);
      if (err) nuevos[c.clave] = err;
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    const salida: Valores = {};
    for (const c of config.campos) {
      salida[c.clave] = c.tipo === 'numero' ? Number(valores[c.clave]) : valores[c.clave].trim();
    }
    onGuardar(salida);
  };

  const entrada = 'w-full rounded-lg border px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-teal-500/20';

  return (
    <form onSubmit={enviar} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {config.campos.map((c) => {
          const id = `campo-${c.clave}`;
          const opciones = c.opciones ? c.opciones(state) : [];
          const clase = `${entrada} ${errores[c.clave] ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-teal-500'}`;
          return (
            <div key={c.clave} className={c.completo ? 'sm:col-span-2' : ''}>
              {c.tipo === 'opciones'
                ? <span className="block text-sm font-medium text-slate-700 mb-1">{c.etiqueta}</span>
                : <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{c.etiqueta}</label>}
              {c.tipo === 'opciones' ? (
                <div>
                  <Opciones id={id} etiqueta={c.etiqueta} value={String(valores[c.clave])} onChange={(v) => cambiar(c.clave, v)} opciones={opciones} />
                </div>
              ) : c.tipo === 'buscar' ? (
                <Buscador
                  id={id} value={String(valores[c.clave])} onChange={(v) => cambiar(c.clave, v)} opciones={opciones}
                  placeholder={`Buscar ${c.etiqueta.toLowerCase()}`} claseInput={clase}
                />
              ) : c.tipo === 'select' ? (
                <select id={id} value={valores[c.clave]} onChange={(e) => cambiar(c.clave, e.target.value)} className={clase}>
                  <option value="">Selecciona una opción</option>
                  {opciones.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  id={id}
                  type={c.tipo === 'numero' ? 'number' : c.tipo === 'correo' ? 'email' : 'text'}
                  min={c.tipo === 'numero' ? 0 : undefined}
                  step={c.tipo === 'numero' ? 'any' : undefined}
                  value={valores[c.clave]}
                  onChange={(e) => cambiar(c.clave, e.target.value)}
                  className={clase}
                />
              )}
              {errores[c.clave] && <p className="text-xs text-red-600 mt-1">{errores[c.clave]}</p>}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
          Cancelar
        </button>
        <button type="submit" disabled={enviando}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
          {enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : `Crear ${config.singular}`}
        </button>
      </div>
    </form>
  );
};
