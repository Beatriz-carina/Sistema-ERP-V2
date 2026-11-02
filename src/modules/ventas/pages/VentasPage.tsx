import { Routes, Route, Navigate } from 'react-router-dom';
import { useErp } from '../../../core/hooks/useErp';
import { CadenaFlujo, type PasoFlujo } from '../../../core/components/CadenaFlujo';
import { CotizacionesPage } from './CotizacionesPage';
import { OrdenesVentaPage } from './OrdenesVentaPage';
import { FacturacionPage } from './FacturacionPage';
import { ComprobantePage } from './ComprobantePage';

export const VentasPage: React.FC = () => {
  const { state } = useErp();
  const cobrar = state.cuentas.filter((c) => c.tipo === 'Cobrar');

  const pasos: PasoFlujo[] = [
    { sub: 'cotizaciones', titulo: 'Cotizaciones', cantidad: state.cotizaciones.length,
      pendientes: state.cotizaciones.filter((c) => c.estado === 'Pendiente').length, textoPendiente: 'por aceptar' },
    { sub: 'ordenes', titulo: 'Órdenes de venta', cantidad: state.ordenesVenta.length, pendientes: 0, textoPendiente: '' },
    { sub: 'facturacion', titulo: 'Facturación', cantidad: state.ventas.length,
      pendientes: state.ordenesVenta.filter((o) => o.estado === 'Pendiente').length, textoPendiente: 'por facturar' },
    // El cobro ocurre en Tesorería: la cadena muestra el puente entre los dos módulos.
    { sub: 'por-cobrar', modulo: 'tesoreria', titulo: 'Cobro', cantidad: cobrar.length,
      pendientes: cobrar.filter((c) => c.estado === 'Pendiente').length, textoPendiente: 'por cobrar' },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <CadenaFlujo modulo="ventas" pasos={pasos} />
      <Routes>
        <Route index element={<Navigate to="cotizaciones" replace />} />
        <Route path="cotizaciones" element={<CotizacionesPage />} />
        <Route path="ordenes" element={<OrdenesVentaPage />} />
        <Route path="facturacion" element={<FacturacionPage />} />
        <Route path="comprobante/:id" element={<ComprobantePage />} />
        <Route path="*" element={<Navigate to="cotizaciones" replace />} />
      </Routes>
    </div>
  );
};
