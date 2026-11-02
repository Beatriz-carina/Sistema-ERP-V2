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
        icon: Truck,
        submodulos: [
          { path: 'ordenes', nombre: 'Órdenes de compra' },
          { path: 'kardex', nombre: 'Kardex' },
        ],
      },
      {
        path: 'inventario',
        nombre: 'Inventario',
        icon: Boxes,
        submodulos: [
          { path: 'stock', nombre: 'Stock' },
          { path: 'movimientos', nombre: 'Movimientos' },
        ],
      },
      {
        path: 'tesoreria',
        nombre: 'Tesorería',
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
        icon: FolderOpen,
      },
      {
        path: 'reportes',
        nombre: 'Reportes',
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
        icon: ShieldCheck,
      },
      {
        path: 'cloud',
        nombre: 'Cloud',
        icon: Cloud,
      },
    ],
  },
];

export const ERP_MODULOS: ErpModulo[] = ERP_MENU.flatMap((g) => g.modulos);
