import type { ConfigMaestro } from '../../mantenimiento/config/maestros';
import { saldoCuenta } from '../../../core/services/erpStore';
import { formatMoneda } from '../../../core/utils/format';

export const CONFIG_CUENTAS: ConfigMaestro = {
  coleccion: 'cuentasBancarias', tab: 'Cuentas bancarias', singular: 'cuenta bancaria', plural: 'cuentas bancarias', genero: 'f',
  columnas: [
    { titulo: 'Banco', celda: (f, s) => s.bancos.find((b) => b.id === f.bancoId)?.nombre ?? '-' },
    { titulo: 'Número de cuenta', celda: (f) => f.numero },
    { titulo: 'Tipo', celda: (f) => f.tipo },
    { titulo: 'Saldo', celda: (f, s) => formatMoneda(saldoCuenta(s.movimientosBanco, String(f.id))), derecha: true },
    { titulo: 'Estado', celda: (f) => f.estado, badge: true },
  ],
  campos: [
    { clave: 'bancoId', etiqueta: 'Banco', tipo: 'select', requerido: true,
      opciones: (s) => s.bancos.filter((b) => b.estado === 'Activo').map((b) => ({ value: b.id, label: b.nombre })) },
    { clave: 'tipo', etiqueta: 'Tipo de cuenta', tipo: 'opciones', requerido: true,
      opciones: () => [{ value: 'Corriente', label: 'Corriente' }, { value: 'Ahorros', label: 'Ahorros' }] },
    { clave: 'numero', etiqueta: 'Número de cuenta', tipo: 'texto', requerido: true, completo: true,
      validar: (v) => (/^\d{10,20}$/.test(v) ? null : 'El número debe tener entre 10 y 20 dígitos.') },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'opciones', requerido: true,
      opciones: () => [{ value: 'Activo', label: 'Activo' }, { value: 'Inactivo', label: 'Inactivo' }] },
  ],
  inicial: { bancoId: '', tipo: 'Corriente', numero: '', estado: 'Activo' },
};
