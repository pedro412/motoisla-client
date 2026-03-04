# Work Changelog

## 2026-03-04 (Backlog rentabilidad inversionistas v1)
- Se documentó y priorizó en P1 el trabajo de `Costo Operativo en Tiempo Real + Reparto Neto a Inversionistas` para implementación posterior.
- Se agregó la especificación ejecutable en `docs/BACKLOG_PROFITABILITY_ENGINE_V1.md` con reglas de cálculo, decisiones cerradas, APIs propuestas, riesgos e idempotencia.
- Se alinearon `docs/NEXT_STEPS.md`, `docs/PROJECT_STATUS.md` y `docs/README.md` para reflejar este backlog.
- Cambio documental únicamente: no hay feature productiva ni modificación de contratos runtime en esta entrega.

## 2026-03-02 (Gastos + Reportes financieros)
- Nueva pantalla `/expenses` con selector mensual, KPIs operativos y administración de gastos pagados/pendientes.
- Soporte de plantillas de gastos fijos, generación mensual explícita y marcación de pagos/cancelación desde UI.
- Dashboard `/admin/reports` rediseñado con KPIs financieros, inventario propio vs inventario de inversionistas y exposición económica reclasificada.
- Reportes ahora muestran utilidad bruta, participación de inversionistas y utilidad neta real de tienda.

## 2026-03-01 (Apartados + Clientes + Detalle de Venta)
- Nuevo flujo de apartados desde `/pos` con captura de cliente por teléfono, anticipo libre y fecha límite.
- Nuevo módulo `/apartados` con listado, detalle, registro de abonos, extensión y vencimiento manual.
- Nueva integración de cliente en POS para reutilizar nombre/teléfono y aplicar saldo a favor en ventas normales.
- Nueva pantalla `/ventas/[id]` con detalle de venta, productos, pagos y resumen de cliente.
- Ajustes visuales en `/ventas` y `/apartados` para tablas más compactas y etiquetas operativas en español.
- Tipografía global corregida cargando `Roboto` vía `next/font` para alinear Material UI.

## 2026-02-27
- Integración del cliente con backend real vía BFF.
- Implementación de handlers auth y proxy autenticado.
- Reorganización de rutas a `(public)`, `(auth)`, `(private)`.
- Implementación de catálogo público, POS y reportes admin.
- Implementación de store de sesión con Zustand.
- Corrección de redirección raíz y rutas legacy (`/dashboard`, `/productos`, `/ventas`).
- Corrección de `proxy.ts` para Next 16.
- Validaciones ejecutadas: lint, typecheck, test, test:e2e.

## 2026-02-27 (Compras)
- Nueva pantalla `/purchases/imports` con selector proveedor/parser.
- Integración con `import-batches`: create, parse, edición de líneas y confirmación.
- Soporte de `public_price` editable con margen en vivo por línea.
- Placeholder de feature futuro para carga de imagen en tabla preview.

## 2026-02-27 (Compras v6)
- Migración a parse en cliente para parser MYESA (`src/modules/purchases/parsers/myesa.parser.ts`).
- Nuevo submit único de compra al endpoint backend `POST /import-batches/preview-confirm/`.
- Eliminación de roundtrip de parse para preview (respuesta inmediata en UI).
- Tests unitarios nuevos del parser MYESA con caso real y fallback de líneas inválidas.

## 2026-02-27 (Compras v7)
- Preview de importación migrado de tabla a cards por producto en `/purchases/imports`.
- Parser MYESA ahora sugiere `brand_name` y `product_type_name` por heurística.
- Autocomplete con opción de creación inline para marcas y tipos (`/brands`, `/product-types`).
- Confirmación envía taxonomy por línea y muestra error claro cuando backend devuelve `taxonomy_not_found`.

## 2026-02-28 (Productos + Inventario)
- Nuevo módulo privado `/products` con navegación dedicada, listado, búsqueda, filtros por marca/tipo y métricas de conteo.
- Vista de detalle con precios, utilidad, marca, categoría y tabla de movimientos de inventario.
- Vista editable con cambio de precios, marca, categoría, stock auditado con razón y borrado con confirmación.
- Nuevo `MoneyInput` reutilizable con máscara para importes.
- Ajustes en compras para reconciliar productos existentes por SKU durante parse local y actualizar precios al reimportar.

## 2026-02-28 (Nueva Venta + Ventas)
- `POS` renombrado visualmente a `Nueva Venta`.
- Nuevo flujo de checkout: buscador tipo dropdown, carrito compacto, resumen sticky y botón principal `Cobrar`.
- Cobro en modal con efectivo/tarjeta, sugerencias de efectivo y cálculo de cambio.
- La venta se crea y confirma en un solo paso desde el modal de cobro; el resultado se muestra en modal success.
- Nueva pantalla `/ventas` con tabla paginada para historial y cancelación desde UI.
- Integración frontend con planes de comisión de tarjeta configurables desde backend.

## 2026-02-28 (Inversionistas + Ledger)
- Nuevo módulo privado `/investors` solo para `ADMIN`, con navegación dedicada y guard de ruta.
- Alta de inversionista con `display_name` y capital inicial opcional.
- Vista de detalle con balances (`capital`, `inventory`, `profit`), acciones de compra, depósito y retiro.
- Modal de compra de productos con cálculo de costo neto + IVA, validación contra capital disponible y stock asignable.
- Tabla de asignaciones ordenada con productos en stock primero, vendidos al final y estatus visual por línea.
- Tabla de movimientos con resaltado por tipo de movimiento para identificar salidas de capital, depósitos y utilidades.
