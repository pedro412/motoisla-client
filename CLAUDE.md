# Moto Isla Client — Agent Context

## Two-repo system
This is one of two repos. The backend API lives in `motoisla-server` (Django + DRF).
All client API calls go through a Next.js proxy — never directly to Django.

## Stack
- Next.js (App Router), React 19, TypeScript
- MUI v7 (Material UI) — dark theme, fully configured
- TanStack Query v5 — all server state
- Zustand — client state (session, printer config)
- Vitest + Playwright for tests
- Package manager: **pnpm** (`pnpm dev` to run)

## Architecture: request flow

```
Browser component
  → httpClient (src/lib/api/http-client.ts)
    → /api/proxy/[...path] (Next.js route handler)
      → Django backend /api/v1/...
```

- `httpClient` prepends `/api/proxy` to every path automatically — pass only the Django path (e.g. `/products/`)
- The proxy route auto-refreshes JWT on 401 via httpOnly cookies
- Auth cookies are set by `src/app/api/auth/` route handlers (login/logout/refresh/session)
- Never call the Django API directly from browser code

## Directory structure

```
src/
  app/
    (auth)/           # login, recuperar-cuenta
    (private)/        # all authenticated pages
    (public)/         # catalog (no auth)
    api/
      auth/           # login, logout, refresh, session route handlers
      proxy/[...path] # catch-all proxy to Django
  components/
    common/           # page-header, detail-page-header
    layout/           # app-shell, app-sidebar, app-topbar
    forms/            # money-input
  modules/<module>/
    services/         # API calls via httpClient
    components/       # page-level components (co-located with module)
    utils.ts          # module-specific helpers
  lib/
    api/
      http-client.ts  # unified HTTP client (use this, never raw fetch)
      errors.ts       # ApiError class
      query-client.ts # TanStack Query config
    auth/             # cookie helpers, server-session
    config/env.ts     # environment vars
    print/
      escpos.ts       # ESC/POS ticket builders (sale, layaway, test)
      usb-printer.ts  # WebUSB printer driver
    types/            # TypeScript types per domain
  store/
    session-store.ts  # Zustand: auth session
    printer-store.ts  # Zustand + persist: USB printer config
  theme/
    theme.ts          # MUI theme (dark blue-slate, all component overrides)
  config/
    navigation.tsx    # sidebar nav items
  providers/
    app-providers.tsx # QueryClient + ThemeProvider wrapper
```

## Adding a new feature — checklist

1. **Types**: add to `src/lib/types/<domain>.ts`
2. **Service**: create/extend `src/modules/<module>/services/<module>.service.ts` using `httpClient`
3. **Page component**: if complex, create `src/modules/<module>/components/<name>.tsx` and import from the route page
4. **Route page**: `src/app/(private)/<route>/page.tsx` — thin shell, imports the module component
5. **Navigation**: add entry to `src/config/navigation.tsx` if needed

## Key conventions

- API errors shape: `{ code, detail, fields }` — use `ApiError` class, not raw `Error`
- DRF pagination shape: `{ count, next, previous, results }`
- UI language: **Spanish** (labels, buttons, messages)
- Backend/API language: English (field names, codes)
- Roles: `ADMIN`, `CASHIER`, `INVESTOR` (source of truth is Django Groups)
- Void window: 10 min for cashier, unlimited for admin
- Cashier discount >10% requires admin override

## Design system

Full spec: `.interface-design/system.md` — **read this before building any UI**.

Key points:
- Dark blue-slate theme: base `#0f172a` → card `#131d2e` → elevated `#1a2540`
- Single accent: `#38bdf8` (sky-400)
- MUI theme handles TextField, Button, Chip, Drawer, Table, Alert, Dialog, Skeleton automatically — no per-page sx needed for these
- Chip semantic colors (status/state) require per-component sx (see system.md)
- Page header pattern, KpiCard pattern, and Section Card pattern are documented in system.md
- Sidebar Drawer bg = page bg (#0f172a) — unified surface
- Topbar: transparent + `rgba(15,23,42,0.85)` + backdrop-blur 12px

## Thermal printing (ESC/POS via WebUSB)

- `src/lib/print/escpos.ts`: `buildSaleTicketBytes`, `buildLayawayTicketBytes`, `buildTestTicketBytes`
- `src/lib/print/usb-printer.ts`: `printViaUSB(data: Uint8Array)`, `getAuthorizedDevices()`
- `src/store/printer-store.ts`: persists `charWidth` (default 42), `storeAddress`, `storePhone`
- Settings page: `src/app/(private)/settings/printer/page.tsx`
- WebUSB only works in browser (not SSR). Use `isWebUsbSupported()` before calling print APIs.

## Routes

| Path | Description |
|---|---|
| `/login` | Auth |
| `/pos` | POS — create + confirm sale |
| `/ventas` | Sales history list |
| `/ventas/[id]` | Sale detail |
| `/products` | Product catalog list |
| `/products/[id]` | Product detail + stock movements |
| `/products/new` | Create product (admin only) |
| `/products/[id]/edit` | Edit product |
| `/purchases` | Purchases overview |
| `/purchases/receipts` | Purchase receipts list |
| `/purchases/receipts/[id]` | Receipt detail |
| `/purchases/imports` | Invoice import (MYESA parser) |
| `/apartados` | Layaways list |
| `/apartados/[id]` | Layaway detail + payments |
| `/investors` | Investors list |
| `/investors/[id]` | Investor detail + ledger |
| `/expenses` | Expenses list |
| `/admin/reports` | Sales reports (admin only) |
| `/settings/printer` | USB printer config |
| `/catalog` | Public product catalog (no auth) |
| `/catalog/[sku]` | Public product detail |

## Running and testing

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright
pnpm lint         # ESLint
```

## Backend API reference

All endpoints are under `/api/v1/` on the Django server. The proxy strips `/api/proxy` and forwards the rest.
See `motoisla-server/README.md` for the full endpoint list and business rules.
