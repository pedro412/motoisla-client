# Work Changelog

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
