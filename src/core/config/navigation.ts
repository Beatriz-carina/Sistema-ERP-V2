import {
  LayoutDashboard, Database, ShoppingCart, Truck, Boxes, Wallet,
  FolderOpen, BarChart3, ShieldCheck, Cloud,
  type LucideIcon,
} from 'lucide-react';

/** El ERP ahora es una app propia: vive en la raíz del dominio (/dashboard, /ventas…). */
export const ERP_BASE = '';

export interface ErpSubmodulo {
  path: string;
  nombre: string;
}

export interface ErpModulo {
  path: string;
  nombre: string;
  icon: LucideIcon;
  /** Una línea que explica para qué sirve el módulo. Se muestra al abrirlo. */
  descripcion?: string;
  /** Pantallas del módulo. Se muestran debajo del módulo cuando está abierto. */
  submodulos?: ErpSubmodulo[];
}

export interface ErpGrupo {
  titulo: string;
  modulos: ErpModulo[];
}

/** Ruta absoluta de un módulo o de una de sus pantallas. */
export const ruta = (modulo: string, sub?: string): string =>
  `${ERP_BASE}/${modulo}${sub ? `/${sub}` : ''}`;

export const ERP_MENU: ErpGrupo[] = [
  {
    titulo: 'Principal',
    modulos: [
      {
        path: 'dashboard',
        nombre: 'Dashboard',
        descripcion: 'Resumen de ventas, compras, utilidad y caja. Solo lee lo que producen los demás módulos.',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    titulo: 'Maestros',
    modulos: [
      {
        path: 'mantenimiento',
        nombre: 'Mantenimiento',
        descripcion: 'Datos base: clientes, proveedores, productos y almacenes. Los demás módulos los usan.',
        icon: Database,
      },
    ],
  },
  {
    titulo: 'Operaciones',
    modulos: [
      {
        path: 'ventas',
        nombre: 'Ventas',
        descripcion: 'Vende y factura. Al emitir la factura baja el stock y se genera el cobro.',
        icon: ShoppingCart,
        submodulos: [
          { path: 'cotizaciones', nombre: 'Cotizaciones' },
          { path: 'ordenes', nombre: 'Órdenes de venta' },
          { path: 'facturacion', nombre: 'Facturación' },
        ],
      },
      {
        path: 'compras',
        nombre: 'Compras',
        descripcion: 'Pide y recibe mercadería. Al recibir sube el stock y se genera la deuda con el proveedor.',
        icon: Truck,
        submodulos: [
          { path: 'ordenes', nombre: 'Órdenes de compra' },
          { path: 'kardex', nombre: 'Kardex' },
        ],
      },
      {
        path: 'inventario',
        nombre: 'Inventario',
        descripcion: 'Stock por almacén, movimientos y ajustes con motivo.',
        icon: Boxes,
        submodulos: [
          { path: 'stock', nombre: 'Stock' },
          { path: 'movimientos', nombre: 'Movimientos' },
        ],
      },
      {
        path: 'tesoreria',
        nombre: 'Tesorería',
        descripcion: 'Caja, bancos, cobros y pagos. Sin caja abierta no se mueve efectivo.',
        icon: Wallet,
        submodulos: [
          { path: 'caja', nombre: 'Caja' },
          { path: 'bancos', nombre: 'Bancos' },
          { path: 'por-cobrar', nombre: 'Por cobrar' },
          { path: 'por-pagar', nombre: 'Por pagar' },
        ],
      },
    ],
  },
  {
    titulo: 'Gestión',
    modulos: [
      {
        path: 'documentos',
        nombre: 'Documentos',
        descripcion: 'Archivo de las facturas y comprobantes que el sistema guarda al comprar y vender.',
        icon: FolderOpen,
      },
      {
        path: 'reportes',
        nombre: 'Reportes',
        descripcion: 'Consultas y exportación de lo registrado en el sistema.',
        icon: BarChart3,
      },
    ],
  },
  {
    titulo: 'Sistema',
    modulos: [
      {
        path: 'administracion',
        nombre: 'Administración',
        descripcion: 'Usuarios, roles y permisos, datos de la empresa y auditoría.',
        icon: ShieldCheck,
      },
      {
        path: 'cloud',
        nombre: 'Cloud',
        descripcion: 'Servicios en la nube del proyecto.',
        icon: Cloud,
      },
    ],
  },
];

export const ERP_MODULOS: ErpModulo[] = ERP_MENU.flatMap((g) => g.modulos);
