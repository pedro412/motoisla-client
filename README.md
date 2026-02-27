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
- `/admin/reports` reportes admin

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

### En curso / pendiente
- Mejorar validaciones y UX de errores en POS.
- E2E funcional completo de negocio (no solo smoke).
- Endurecimiento de errores globales y observabilidad frontend.

### Backlog
- UI de `expenses`.
- UI de `layaway`.
- UI de `investors/ledger`.
- Multipago POS.

## Documentación
- [docs index](./docs/README.md)
- [project status](./docs/PROJECT_STATUS.md)
- [next steps](./docs/NEXT_STEPS.md)
- [qa checklist](./docs/QA_CHECKLIST.md)
- [work changelog](./docs/CHANGELOG_WORK.md)
