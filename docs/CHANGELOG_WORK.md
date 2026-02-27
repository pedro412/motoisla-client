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
