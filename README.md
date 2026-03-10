# MotoIsla Client

Frontend Next.js para operar MotoIsla contra `motoisla-server` en local.

## Stack
- Next.js App Router + TypeScript
- Material UI (dark por defecto)
- TanStack Query
- Zustand (sesión)
- Vitest + Testing Library
- Playwright

## Variables de entorno
Crear `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_MEDIA_MAX_BYTES=8388608
NEXT_PUBLIC_MEDIA_MAX_DIMENSION=3000
NEXT_PUBLIC_MEDIA_BASE_URL=https://public.r2.dev
```

## Scripts
- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`

## Rutas principales
- `/catalog` catálogo público
- `/catalog/[sku]` detalle público
- `/login` autenticación
- `/pos` POS privado
- `/apartados` gestión de apartados
- `/expenses` gastos mensuales, plantillas fijas y cierre operativo
- `/products` catálogo interno con detalle, edición y movimientos
- `/ventas` historial de ventas
- `/ventas/[id]` detalle de venta con cliente, líneas y pagos
- `/admin/reports` dashboard financiero con utilidad tienda vs inversionistas
- `/purchases/imports` compras con parseo de factura

## Integración backend
- BFF en Next (`/api/auth/*`, `/api/proxy/*`)
- Cookies httpOnly para `access/refresh`
- Refresh automático al recibir `401` en proxy
- Manejo uniforme de errores: `code/detail/fields`

## Progreso

### Completado
- Auth login/logout/session con cookies httpOnly.
- Proxy autenticado con refresh automático.
- Guards de rutas privadas por sesión/rol.
- Catálogo público con búsqueda y paginación.
- POS create/confirm/void.
- POS con cliente opcional por teléfono, saldo a favor y creación de apartados desde carrito.
- Dashboard de `Reportes` (`/admin/reports`) con ventas, compras, gastos, inventario y desglose económico de tienda vs inversionistas.
- Módulo de `Gastos` (`/expenses`) con plantillas recurrentes, generación mensual y control de pendientes/pagados.
- Módulo de apartados con listado, detalle, abonos, extensión y vencimiento.
- Historial de ventas con detalle por venta.
- Motor de rentabilidad integrado en cliente:
  - preview de utilidad neta en checkout POS (`/sales/preview-profitability/`)
  - snapshot financiero visible en detalle de venta (`/ventas/[id]`)
  - lectura de métricas de rentabilidad en `Reportes` cuando backend las expone
- Compras por importación con parse local (`MYESA`), preview en cards y confirmación backend transaccional (`preview-confirm`).
- Parser MYESA en cliente ya soporta filas de producto con o sin prefijo `**`, manteniendo cálculo de `Costo + IVA` en preview.
- Captura de `marca` y `tipo de producto` por línea con sugerencia automática + creación inline de taxonomy.
- Cálculo de `precio_publico` y margen en tiempo real por línea.
- Módulo privado de `Productos` con listado, filtros por marca/tipo, detalle, edición, borrado, tabla de movimientos y carga real de imagenes via presigned upload.
- Uploader de `Productos` mejorado con biblioteca de assets existentes para reutilizar imagenes antes de abrir filesystem (evita duplicados).
- En `/purchases/imports`, cada línea del preview permite seleccionar múltiples imagenes (existentes o nuevas) y asociarlas al confirmar la compra.
- Regla visual nueva para vistas de detalle: `breadcrumb` arriba, botón `Volver` a la izquierda y acción principal a la derecha.
- Regla visual nueva para vistas operativas: superficies dark/slate, headers con jerarquía alta y tablas sin bloques blancos planos.

### En curso / pendiente
- Mejorar validaciones y UX de errores en POS.
- E2E funcional completo de negocio (no solo smoke).
- Endurecimiento de errores globales y observabilidad frontend.
- E2E profundo de compras (parse cliente/edición/confirm + validación de stock).

### Backlog
- Multipago POS.
- Detalle de cliente con historial consolidado de compras.
- Reimpresión de ticket desde detalle de venta.
- Comparativo de `Reportes` contra periodo anterior y drill-down financiero.

## Documentación
- [docs index](./docs/README.md)
- [r2 production checklist](./docs/R2_PRODUCTION_CHECKLIST.md)
- [project status](./docs/PROJECT_STATUS.md)
- [next steps](./docs/NEXT_STEPS.md)
- [qa checklist](./docs/QA_CHECKLIST.md)
- [work changelog](./docs/CHANGELOG_WORK.md)
