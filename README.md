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
- `/products` catálogo interno con detalle, edición y movimientos
- `/admin/reports` reportes admin
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
- Reportes admin (`/metrics`, `/reports/sales`).
- Compras por importación con parse local (`MYESA`), preview en cards y confirmación backend transaccional (`preview-confirm`).
- Captura de `marca` y `tipo de producto` por línea con sugerencia automática + creación inline de taxonomy.
- Cálculo de `precio_publico` y margen en tiempo real por línea.
- Módulo privado de `Productos` con listado, filtros por marca/tipo, detalle, edición, borrado y tabla de movimientos.

### En curso / pendiente
- Mejorar validaciones y UX de errores en POS.
- E2E funcional completo de negocio (no solo smoke).
- Endurecimiento de errores globales y observabilidad frontend.
- E2E profundo de compras (parse cliente/edición/confirm + validación de stock).

### Backlog
- UI de `expenses`.
- UI de `layaway`.
- UI de `investors/ledger`.
- Multipago POS.
- Carga de imagen en tabla preview de compras (placeholder ya reservado).

## Documentación
- [docs index](./docs/README.md)
- [project status](./docs/PROJECT_STATUS.md)
- [next steps](./docs/NEXT_STEPS.md)
- [qa checklist](./docs/QA_CHECKLIST.md)
- [work changelog](./docs/CHANGELOG_WORK.md)
