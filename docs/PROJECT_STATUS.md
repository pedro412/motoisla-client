# Project Status - MotoIsla Client

## Resumen ejecutivo
- Estado general: **MVP integrado operativo en local** con checkout POS, apartados, gastos y reportes financieros.
- Backend target: `motoisla-server` (`/api/v1`) con BFF en Next.

## Completado
- Auth BFF con cookies httpOnly (`login`, `refresh`, `logout`, `session`).
- Proxy autenticado con refresh automático en `401`.
- Guards de rutas privadas por sesión y rol.
- Catálogo público (`/catalog`, `/catalog/[sku]`) con búsqueda y paginación.
- POS renovado:
  - `/pos` como `Nueva Venta` con buscador tipo dropdown, carrito compacto y checkout en modal.
  - creación + confirmación en un solo flujo de cobro.
  - soporte de comisión de tarjeta configurable y MSI desde backend.
- captura opcional de cliente por teléfono, lookup de saldo a favor y creación de apartados desde el carrito.
- Historial de ventas en `/ventas` con tabla paginada, detalle por venta y cancelación por reglas backend.
- Apartados:
  - `/apartados` con listado operativo y filtros.
  - `/apartados/[id]` con detalle, abonos, extensión y vencimiento.
- Reportes (`/admin/reports`) con `/metrics` y `/reports/sales`, incluyendo utilidad bruta, utilidad neta tienda, participación de inversionistas e inventario separado por ownership económico.
- Gastos (`/expenses`) con resumen mensual, plantillas fijas recurrentes, generación del mes y marcación de pago/cancelación.
- Compras (`/purchases/imports`) con flujo parse local MYESA + preview editable + `preview-confirm` backend.
- El parser MYESA del cliente ya acepta formatos con y sin prefijo `**` en la línea de SKU.
- En compras, el campo intermedio se presenta como `Costo + IVA` (no como “venta”) para reflejar la semántica real del import.
- Cálculo de precio público con margen en tiempo real.
- Productos (`/products`) con listado interno, filtros, detalle, edición, borrado y movimientos de inventario por producto.
- Inversionistas (`/investors`) con listado admin, alta operativa con capital inicial opcional, detalle, compra de productos, depósito/retiro y visualización de ledger.
- Convención UI nueva aplicada en vistas de detalle (`productos`, `ventas`, `apartados`, `inversionistas`):
  - breadcrumb superior
  - botón de regreso a la izquierda
  - acción principal a la derecha
- UI shell privado con navegación por rol y logout real.
- Tests base:
  - unit/integration (Vitest)
  - smoke e2e (Playwright)

## Pendiente prioritario
- Implementar cálculo de costo operativo en tiempo real por venta y reparto neto a inversionistas (documentado en `BACKLOG_PROFITABILITY_ENGINE_V1`).
- Fortalecer validaciones POS por campo (`fields`) y UX de errores finos en modal de cobro.
- Completar e2e de negocio (POS + apartados + compras con assertions de inventario).
- Endurecer concurrencia/locking de compra de inversionistas para evitar carreras de asignación simultánea.
- Refinar reportería financiera con comparativos entre periodos y drill-down por bucket.
- Agregar vista de detalle de cliente con historial consolidado para preparar lealtad.
- Definir/ajustar moneda y formatos finales de operación.
- Endurecer observabilidad frontend (logging estructurado y captura de errores).

## Riesgos abiertos
- Sin motor de neto por venta, existe riesgo de payout a inversionistas superior a utilidad real.
- Dependencia de datos/usuarios locales para validar flujos de negocio avanzados.
- Cobertura e2e actual es smoke; falta cobertura funcional profunda.
