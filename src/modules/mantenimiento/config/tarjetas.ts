import {
  Users, Truck, UserCheck, Package, Building2, Tag, Award, Ruler, Coins, Landmark,
  type LucideIcon,
} from 'lucide-react';

export interface Tarjeta {
  icon: LucideIcon;
  grupo: string;
}

export const GRUPOS_TARJETAS = ['Personas y empresas', 'Productos y almacenes', 'Catálogos'];

export const TARJETAS: Record<string, Tarjeta> = {
  clientes: { icon: Users, grupo: 'Personas y empresas' },
  proveedores: { icon: Truck, grupo: 'Personas y empresas' },
  vendedores: { icon: UserCheck, grupo: 'Personas y empresas' },
  productos: { icon: Package, grupo: 'Productos y almacenes' },
  almacenes: { icon: Building2, grupo: 'Productos y almacenes' },
  categorias: { icon: Tag, grupo: 'Catálogos' },
  marcas: { icon: Award, grupo: 'Catálogos' },
  unidades: { icon: Ruler, grupo: 'Catálogos' },
  bancos: { icon: Landmark, grupo: 'Catálogos' },
  monedas: { icon: Coins, grupo: 'Catálogos' },
};
