# Project Status - MotoIsla Client

## Resumen ejecutivo
- Estado general: **MVP integrado operativo en local**.
- Backend target: `motoisla-server` (`/api/v1`) con BFF en Next.
- Rama activa: `codex/scaffold-admin-dashboard-pr`.

## Completado
- Auth BFF con cookies httpOnly (`login`, `refresh`, `logout`, `session`).
- Proxy autenticado con refresh automático en `401`.
- Guards de rutas privadas por sesión y rol.
- Catálogo público (`/catalog`, `/catalog/[sku]`) con búsqueda y paginación.
- POS (`/pos`) con create/confirm/void.
- Reportes admin (`/admin/reports`) con `/metrics` y `/reports/sales`.
- Compras (`/purchases/imports`) con flujo parse local MYESA + preview editable + `preview-confirm` backend.
- Cálculo de precio público con margen en tiempo real.
- Productos (`/products`) con listado interno, filtros, detalle, edición, borrado y movimientos de inventario por producto.
- UI shell privado con navegación por rol y logout real.
- Tests base:
  - unit/integration (Vitest)
  - smoke e2e (Playwright)

## Pendiente prioritario
- Fortalecer validaciones POS por campo (`fields`) y UX de errores.
- Completar e2e de negocio (POS + compras con assertions de inventario).
- Definir/ajustar moneda y formatos finales de operación.
- Endurecer observabilidad frontend (logging estructurado y captura de errores).

## Riesgos abiertos
- Dependencia de datos/usuarios locales para validar flujos de negocio avanzados.
- Cobertura e2e actual es smoke; falta cobertura funcional profunda.
