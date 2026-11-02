import type { ColeccionMaestra, ErpState } from '../../../core/types';
import { formatMoneda } from '../../../core/utils/format';

export type Valores = Record<string, string | number>;
export interface Opcion { value: string; label: string }

export interface Campo {
  clave: string;
  etiqueta: string;
  /**
   * opciones = 2 o 3 valores fijos, como botones (Activo | Inactivo).
   * buscar = lista que crece, con búsqueda (marcas, categorías).
   * select = pocas opciones fijas (unidad, moneda, rol).
   */
  tipo: 'texto' | 'numero' | 'correo' | 'select' | 'opciones' | 'buscar';
  requerido?: boolean;
  completo?: boolean;
  opciones?: (s: ErpState) => Opcion[];
  validar?: (valor: string, todos: Record<string, string>) => string | null;
}

export interface Columna {
  titulo: string;
  celda: (fila: Valores, s: ErpState) => string | number;
  badge?: boolean;
  derecha?: boolean;
}

export interface ConfigMaestro {
  coleccion: ColeccionMaestra;
  tab: string;
  singular: string;
  plural: string;
  columnas: Columna[];
  campos: Campo[];
  inicial: Valores;
  /** Para los textos: "Nuevo cliente" o "Nueva categoría". */
  genero?: 'm' | 'f';
}

/* ───────── Piezas reutilizables ───────── */

const ESTADO: Campo = {
  clave: 'estado', etiqueta: 'Estado', tipo: 'opciones', requerido: true,
  opciones: () => [{ value: 'Activo', label: 'Activo' }, { value: 'Inactivo', label: 'Inactivo' }],
};
const COL_ESTADO: Columna = { titulo: 'Estado', celda: (f) => f.estado, badge: true };

const digitos = (n: number, nombre: string) => (v: string): string | null =>
  /^\d+$/.test(v) && v.length === n ? null : `${nombre} debe tener ${n} dígitos.`;

const nombreDe = (lista: { id: string; nombre: string }[], id: string | number): string =>
  lista.find((x) => x.id === id)?.nombre ?? '-';

type Catalogo = 'categorias' | 'marcas' | 'unidades' | 'monedas' | 'bancos';
const opcionesDe = (col: Catalogo) => (s: ErpState): Opcion[] =>
  s[col].map((m) => ({ value: m.id, label: m.nombre }));

function catalogo(coleccion: Catalogo, tab: string, singular: string, plural: string, genero: 'm' | 'f' = 'f'): ConfigMaestro {
  return {
    coleccion, tab, singular, plural, genero,
    columnas: [{ titulo: 'Nombre', celda: (f) => f.nombre }, COL_ESTADO],
    campos: [{ clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, completo: true }, ESTADO],
    inicial: { nombre: '', estado: 'Activo' },
  };
}

/* ───────── Configuración por entidad ───────── */

export const MAESTROS: ConfigMaestro[] = [
  {
    coleccion: 'clientes', tab: 'Clientes', singular: 'cliente', plural: 'clientes',
    columnas: [
      { titulo: 'Documento', celda: (f) => `${f.tipoDocumento} ${f.numeroDocumento}` },
      { titulo: 'Razón social', celda: (f) => f.razonSocial },
      { titulo: 'Correo', celda: (f) => f.correo },
      { titulo: 'Límite de crédito', celda: (f) => formatMoneda(Number(f.limiteCredito)), derecha: true },
      COL_ESTADO,
    ],
    campos: [
      { clave: 'tipoDocumento', etiqueta: 'Tipo de documento', tipo: 'opciones', requerido: true,
        opciones: () => [{ value: 'RUC', label: 'RUC' }, { value: 'DNI', label: 'DNI' }] },
      { clave: 'numeroDocumento', etiqueta: 'Número de documento', tipo: 'texto', requerido: true,
        validar: (v, t) => (t.tipoDocumento === 'DNI' ? digitos(8, 'El DNI')(v) : digitos(11, 'El RUC')(v)) },
      { clave: 'razonSocial', etiqueta: 'Razón social o nombre', tipo: 'texto', requerido: true, completo: true },
      { clave: 'correo', etiqueta: 'Correo', tipo: 'correo', requerido: true },
      { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', requerido: true },
      { clave: 'direccion', etiqueta: 'Dirección', tipo: 'texto', requerido: true, completo: true },
      { clave: 'limiteCredito', etiqueta: 'Límite de crédito (S/)', tipo: 'numero', requerido: true },
      ESTADO,
    ],
    inicial: { tipoDocumento: 'RUC', numeroDocumento: '', razonSocial: '', correo: '', telefono: '', direccion: '', limiteCredito: 0, estado: 'Activo' },
  },
  {
    coleccion: 'proveedores', tab: 'Proveedores', singular: 'proveedor', plural: 'proveedores',
    columnas: [
      { titulo: 'RUC', celda: (f) => f.ruc },
      { titulo: 'Razón social', celda: (f) => f.razonSocial },
      { titulo: 'Contacto', celda: (f) => f.contacto },
      { titulo: 'Correo', celda: (f) => f.correo },
      COL_ESTADO,
    ],
    campos: [
      { clave: 'ruc', etiqueta: 'RUC', tipo: 'texto', requerido: true, validar: digitos(11, 'El RUC') },
      { clave: 'contacto', etiqueta: 'Persona de contacto', tipo: 'texto', requerido: true },
      { clave: 'razonSocial', etiqueta: 'Razón social', tipo: 'texto', requerido: true, completo: true },
      { clave: 'correo', etiqueta: 'Correo', tipo: 'correo', requerido: true },
      { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', requerido: true },
      { clave: 'direccion', etiqueta: 'Dirección', tipo: 'texto', requerido: true, completo: true },
      ESTADO,
    ],
    inicial: { ruc: '', razonSocial: '', contacto: '', correo: '', telefono: '', direccion: '', estado: 'Activo' },
  },
  {
    coleccion: 'productos', tab: 'Productos', singular: 'producto', plural: 'productos',
    columnas: [
      { titulo: 'Código', celda: (f) => f.codigo },
      { titulo: 'Producto', celda: (f) => f.nombre },
      { titulo: 'Categoría', celda: (f, s) => nombreDe(s.categorias, f.categoriaId) },
      { titulo: 'Marca', celda: (f, s) => nombreDe(s.marcas, f.marcaId) },
      { titulo: 'Precio venta', celda: (f) => formatMoneda(Number(f.precioVenta)), derecha: true },
      COL_ESTADO,
    ],
    campos: [
      { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', requerido: true },
      { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true },
      { clave: 'categoriaId', etiqueta: 'Categoría', tipo: 'buscar', requerido: true, opciones: opcionesDe('categorias') },
      { clave: 'marcaId', etiqueta: 'Marca', tipo: 'buscar', requerido: true, opciones: opcionesDe('marcas') },
      { clave: 'unidadId', etiqueta: 'Unidad de medida', tipo: 'select', requerido: true, opciones: opcionesDe('unidades') },
      { clave: 'monedaId', etiqueta: 'Moneda', tipo: 'select', requerido: true, opciones: opcionesDe('monedas') },
      { clave: 'precioCompra', etiqueta: 'Precio de compra (sin IGV)', tipo: 'numero', requerido: true },
      { clave: 'precioVenta', etiqueta: 'Precio de venta (sin IGV)', tipo: 'numero', requerido: true,
        validar: (v, t) => (Number(v) >= Number(t.precioCompra) ? null : 'El precio de venta no puede ser menor al de compra.') },
      { clave: 'stockMinimo', etiqueta: 'Stock mínimo', tipo: 'numero', requerido: true },
      { clave: 'garantiaMeses', etiqueta: 'Garantía (meses)', tipo: 'numero', requerido: true },
      ESTADO,
    ],
    inicial: { codigo: '', nombre: '', categoriaId: '', marcaId: '', unidadId: '', monedaId: '', precioCompra: 0, precioVenta: 0, stockMinimo: 0, garantiaMeses: 12, estado: 'Activo' },
  },
  {
    coleccion: 'almacenes', tab: 'Almacenes', singular: 'almacén', plural: 'almacenes',
    columnas: [
      { titulo: 'Nombre', celda: (f) => f.nombre },
      { titulo: 'Dirección', celda: (f) => f.direccion },
      COL_ESTADO,
    ],
    campos: [
      { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, completo: true },
      { clave: 'direccion', etiqueta: 'Dirección', tipo: 'texto', requerido: true, completo: true },
      ESTADO,
    ],
    inicial: { nombre: '', direccion: '', estado: 'Activo' },
  },
  {
    coleccion: 'vendedores', tab: 'Vendedores', singular: 'vendedor', plural: 'vendedores',
    columnas: [
      { titulo: 'Nombre', celda: (f) => f.nombre },
      { titulo: 'DNI', celda: (f) => f.documento },
      { titulo: 'Cargo', celda: (f) => f.cargo },
      COL_ESTADO,
    ],
    campos: [
      { clave: 'nombre', etiqueta: 'Nombre completo', tipo: 'texto', requerido: true, completo: true },
      { clave: 'documento', etiqueta: 'DNI', tipo: 'texto', requerido: true, validar: digitos(8, 'El DNI') },
      { clave: 'cargo', etiqueta: 'Cargo', tipo: 'texto', requerido: true },
      ESTADO,
    ],
    inicial: { nombre: '', documento: '', cargo: '', estado: 'Activo' },
  },
  catalogo('categorias', 'Categorías', 'categoría', 'categorías'),
  catalogo('marcas', 'Marcas', 'marca', 'marcas'),
  catalogo('unidades', 'Unidades', 'unidad de medida', 'unidades'),
  catalogo('monedas', 'Monedas', 'moneda', 'monedas'),
  catalogo('bancos', 'Bancos', 'banco', 'bancos', 'm'),
];
