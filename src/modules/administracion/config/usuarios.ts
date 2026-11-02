import type { ConfigMaestro } from '../../mantenimiento/config/maestros';

export const CONFIG_USUARIOS: ConfigMaestro = {
  coleccion: 'usuarios', tab: 'Usuarios', singular: 'usuario', plural: 'usuarios',
  columnas: [
    { titulo: 'Nombre', celda: (f) => f.nombre },
    { titulo: 'Correo', celda: (f) => f.correo },
    { titulo: 'Rol', celda: (f, s) => s.roles.find((r) => r.id === f.rolId)?.nombre ?? '-' },
    { titulo: 'Estado', celda: (f) => f.estado, badge: true },
  ],
  campos: [
    { clave: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, completo: true },
    { clave: 'correo', etiqueta: 'Correo', tipo: 'correo', requerido: true },
    { clave: 'rolId', etiqueta: 'Rol', tipo: 'select', requerido: true,
      opciones: (s) => s.roles.map((r) => ({ value: r.id, label: r.nombre })) },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'opciones', requerido: true,
      opciones: () => [{ value: 'Activo', label: 'Activo' }, { value: 'Inactivo', label: 'Inactivo' }] },
  ],
  inicial: { nombre: '', correo: '', rolId: '', estado: 'Activo' },
};
