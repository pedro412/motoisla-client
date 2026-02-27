# MotoIsla Client

Frontend Next.js para operar MotoIsla contra el backend local `motoisla-server`.

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

## Arquitectura de integración

- BFF en Next (`/api/auth/*`, `/api/proxy/*`)
- Cookies httpOnly para `access/refresh`
- Refresh automático al recibir `401` en proxy
- Manejo uniforme de errores backend: `code/detail/fields`

## Estado

Implementado en este sprint:

- Auth login/logout/session con cookies httpOnly
- Catálogo público con búsqueda y paginación
- POS create/confirm/void
- Reportes admin (`/metrics`, `/reports/sales`)
