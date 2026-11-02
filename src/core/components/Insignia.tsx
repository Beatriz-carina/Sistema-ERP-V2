const VERDE = 'bg-emerald-50 text-emerald-700';
const AMBAR = 'bg-amber-50 text-amber-700';
const ROJO = 'bg-red-50 text-red-700';
const GRIS = 'bg-slate-100 text-slate-600';

const ESTILOS: Record<string, string> = {
  Activo: VERDE, Emitida: VERDE, Recibida: VERDE, Cancelada: VERDE, Normal: VERDE, Ingreso: VERDE, Exitoso: VERDE,
  Pagada: VERDE, Aceptada: VERDE, Facturada: VERDE, Depósito: VERDE,
  Inactivo: 'bg-slate-100 text-slate-500',
  Crédito: AMBAR, Pendiente: AMBAR, Retiro: AMBAR, 'Stock bajo': AMBAR,
  Anulada: GRIS, Vencida: ROJO, 'Sin stock': ROJO, Egreso: ROJO, Rechazado: ROJO,
  Contado: GRIS, Compra: GRIS, Venta: GRIS, Ajuste: GRIS,
};

export const Insignia: React.FC<{ texto: string }> = ({ texto }) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTILOS[texto] ?? GRIS}`}>
    {texto}
  </span>
);
