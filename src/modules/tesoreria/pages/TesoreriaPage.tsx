import { Routes, Route, Navigate } from 'react-router-dom';
import { CajaPage } from './CajaPage';
import { BancosPage } from './BancosPage';
import { EstadoCuenta } from '../components/EstadoCuenta';

/**
 * Tesorería reúne todo el dinero de la empresa:
 * - Caja y Bancos: el dinero que hay.
 * - Por cobrar y Por pagar: el dinero que te deben y el que debes.
 * Ventas y Compras generan las cuentas; aquí se cobran y se pagan.
 */
export const TesoreriaPage: React.FC = () => (
  <div className="max-w-6xl space-y-6">
    <Routes>
      <Route index element={<Navigate to="caja" replace />} />
      <Route path="caja" element={<CajaPage />} />
      <Route path="bancos" element={<BancosPage />} />
      <Route path="por-cobrar" element={<EstadoCuenta tipo="Cobrar" />} />
      <Route path="por-pagar" element={<EstadoCuenta tipo="Pagar" />} />
      <Route path="*" element={<Navigate to="caja" replace />} />
    </Routes>
  </div>
);
