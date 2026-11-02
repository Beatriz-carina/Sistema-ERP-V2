# EnterpriseCloud · ERP

Sistema ERP para una empresa que vende productos tecnológicos: mantenimiento de maestros, ventas,
compras, inventario (kardex), tesorería (caja, bancos, por cobrar, por pagar), documentos, reportes y administración.

Aplicación **independiente** (antes era un módulo dentro de NEXUS).

## Tecnología

- React 19 + TypeScript + Vite
- Tailwind CSS
- React Router (navegación) y Lucide (íconos)
- Datos: por ahora **simulados** en el navegador (`VITE_API_MODE=mock`). Ver "Capa de servicios".

## Ejecutar en local

```bash
npm install
npm run dev
```

Abrir http://localhost:5173 → pantalla de inicio de sesión.

### Usuarios de prueba (contraseña `demo123`)

| Correo | Rol | Módulos |
|---|---|---|
| admin@enterprisecloud.pe | Administrador | Todos |
| ventas@enterprisecloud.pe | Vendedor | Ventas, Tesorería, Documentos, Reportes |
| almacen@enterprisecloud.pe | Almacén | Mantenimiento, Compras, Inventario, Documentos |

El Dashboard lo ven todos. Los permisos se cambian en Administración › Roles y permisos.

## Compilar

```bash
npm run build      # genera la carpeta dist/
npm run preview    # sirve dist/ para probar
```

## Publicar en Vercel

1. Importar este repositorio en Vercel (Add New → Project).
2. Framework: **Vite** (lo detecta solo). Build: `npm run build`. Output: `dist`.
3. Variables de entorno: ninguna obligatoria (por defecto usa datos simulados).

`vercel.json` redirige todas las rutas a `index.html`, así que recargar (F5) en `/ventas`, `/tesoreria/caja`, etc. funciona.

## Cómo se comunican los módulos

Todos los módulos leen y escriben **un solo almacén de datos** (hoy `erpStore`, mañana PostgreSQL):

| Operación | Módulo | Efecto en otros módulos |
|---|---|---|
| Recibir compra en Kardex | Compras | + stock (Inventario) · factura archivada (Documentos) · cuenta Por pagar o egreso de Caja (Tesorería) |
| Emitir factura | Ventas | valida stock y crédito · − stock (Inventario) · comprobante archivado (Documentos) · cuenta Por cobrar o ingreso a Caja (Tesorería) |
| Cobrar / pagar | Tesorería | dinero entra/sale de Caja · la factura o recepción queda Pagada (Ventas/Compras) |
| Depositar / retirar | Tesorería | dinero pasa entre Caja y Bancos |
| Cualquier acción | Todos | queda en la Auditoría con el usuario que la hizo |

## Capa de servicios (preparada para el backend)

Las pantallas **leen** con `useErp()` y **guardan** solo a través de `api` (`src/core/services/api.ts`).
Cada operación ya tiene la ruta REST que tendrá en FastAPI (documento maestro, punto 15):

```
POST /api/v1/auth/login                 POST /api/v1/purchases/orders
POST /api/v1/sales/quotes               POST /api/v1/purchases/orders/{id}/receive
POST /api/v1/sales/quotes/{id}/accept   POST /api/v1/inventory/adjustments
POST /api/v1/sales/orders               POST /api/v1/treasury/cash/open | close
POST /api/v1/sales/orders/{id}/invoice  POST /api/v1/treasury/bank-movements
POST /api/v1/payments                   POST /api/v1/documents ...
POST /api/v1/sales/quotes/{id}/cancel   POST /api/v1/sales/orders/{id}/cancel
POST /api/v1/purchases/orders/{id}/cancel   PUT /api/v1/company
```

- `VITE_API_MODE=mock` (por defecto): ejecuta las reglas en el navegador, con una pequeña demora como un servidor real.
- `VITE_API_MODE=http`: cuando exista el backend. Las pantallas no cambian.

Ver `.env.example`.

## Comprobante electrónico (simulado)

- Al **emitir una factura** se abre su representación impresa con formato peruano: empresa emisora, recuadro
  R.U.C. / FACTURA ELECTRÓNICA / F001-00000001, cliente, detalle con marca y garantía, IGV 18 %, importe total,
  monto en letras, cuadro de cuotas si es a crédito y código QR (librería `qrcode`).
- **Imprimir / Guardar PDF** imprime solo la hoja, en A4.
- También se abre desde Ventas › Facturación › *Ver factura* y desde Documentos › *Ver*.
- Los datos de la empresa emisora se editan en Administración › Parámetros.
- Es una **simulación académica**: lleva la marca *"DOCUMENTO DE PRUEBA · SIN VALOR TRIBUTARIO · NO ENVIADO A SUNAT"*,
  no usa logos de SUNAT y no se envía a SUNAT. La emisión real requiere certificado digital, XML UBL 2.1 firmado
  y envío a SUNAT u OSE (fase de backend).

## Reglas de interfaz

- **Anular:** cotizaciones y órdenes (venta y compra) se anulan solo mientras están *Pendiente*, con motivo obligatorio.
  No se borran: quedan como *Anulada* y la anulación queda en la Auditoría. Lo ya facturado o recibido se corrige con una devolución.
- **Selectores:** listas que crecen (clientes, productos, vendedores, almacenes, marcas, categorías, documentos) usan **buscador**;
  2 o 3 opciones fijas (Contado/Crédito, Activo/Inactivo, RUC/DNI…) usan **botones** (`core/components/Opciones.tsx`);
  el selector desplegable queda solo para pocas opciones fijas (rol, banco, unidad, moneda).

## Estructura

```
src/
├── main.tsx            Punto de entrada (BrowserRouter + ErpApp)
├── ErpApp.tsx          Rutas, login obligatorio y permisos por rol
├── layouts/            Menú lateral, cabecera (usuario y cerrar sesión) y marco general
├── core/
│   ├── config/         Menú y rutas (navigation.ts)
│   ├── services/       api.ts (capa de servicios) · erpStore.ts (reglas y datos) · sesion.ts · seed.ts (datos de ejemplo)
│   ├── hooks/          useErp (leer datos) · useAccion (guardar con "Guardando…") · usePermisos
│   ├── components/     Tabla, modal, indicadores, buscador, formularios de operación…
│   ├── types/          Tipos del dominio
│   └── utils/          Formato de moneda/fechas y exportación CSV
└── modules/
    ├── login/          Inicio de sesión
    ├── dashboard/      Resumen e indicadores
    ├── mantenimiento/  Clientes, proveedores, productos, almacenes…
    ├── ventas/         Cotizaciones → órdenes → facturación
    ├── compras/        Órdenes → recepción (Kardex)
    ├── inventario/     Stock, movimientos y ajustes
    ├── tesoreria/      Caja · Bancos · Por cobrar · Por pagar
    ├── documentos/     Repositorio (S3 simulado)
    ├── reportes/       Reportes y exportación CSV
    └── administracion/ Usuarios, roles, auditoría, parámetros
```

## Parámetros (src/core/services/erpStore.ts)

| Parámetro | Valor | Uso |
|---|---|---|
| `IGV` | 0.18 | Impuesto en ventas y compras |
| `DIAS_CREDITO` | 30 | Plazo de pago al crédito |
| `LIMITE_REGISTROS` | Infinity | Sin tope (poner 1 para una demostración corta) |

Para empezar de cero: Administración › Parámetros › Restablecer datos.
