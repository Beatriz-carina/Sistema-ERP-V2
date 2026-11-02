import { useState } from 'react';
import { Layers } from 'lucide-react';
import { useAccion } from '../../../core/hooks/useAccion';
import { api } from '../../../core/services/api';

/** Inicio de sesión. Las credenciales nunca se muestran en pantalla. */
export const LoginPage: React.FC = () => {
  const { enviando, ejecutar } = useAccion();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const r = await ejecutar(() => api.auth.login(correo, clave));
    // Si entra, el router lo lleva al Dashboard solo (la sesión cambió).
    if (!r.ok) setError(r.error);
  };

  const campo = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-slate-900">EnterpriseCloud</p>
              <p className="text-xs text-slate-500">Gestión empresarial</p>
            </div>
          </div>

          <form onSubmit={entrar} noValidate className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h1 className="text-lg font-semibold text-slate-900">Iniciar sesión</h1>

            <div>
              <label htmlFor="login-correo" className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
              <input id="login-correo" type="email" autoComplete="username" value={correo}
                onChange={(e) => setCorreo(e.target.value)} className={campo} />
            </div>
            <div>
              <label htmlFor="login-clave" className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input id="login-clave" type="password" autoComplete="current-password" value={clave}
                onChange={(e) => setClave(e.target.value)} className={campo} />
            </div>

            {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={enviando}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} EnterpriseCloud · Gestión empresarial
      </footer>
    </div>
  );
};
