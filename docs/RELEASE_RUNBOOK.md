# Release Runbook (Client + Server)

Guia oficial para liberar nuevas features de MotoIsla a produccion.
Este documento es la fuente de verdad para cada release.

## 1) Politica de versionado
- Se usa una version de producto unica: `vX.Y.Z` (SemVer).
- `patch`: bugfixes y ajustes sin cambios mayores.
- `minor`: nuevas features retrocompatibles.
- `major`: cambios breaking o migraciones de alto impacto.
- Aunque solo cambie un repo, la version global siempre avanza y guarda SHAs de client/server.
- Si no existe tag previo, la primera release inicia en `v1.0.0`.

## 2) Workflows oficiales
- `motoisla-client/.github/workflows/release-orchestrator.yml`
- `motoisla-client/.github/workflows/deploy-prod.yml`
- `motoisla-server/.github/workflows/deploy-prod.yml`

Orden obligatorio del flujo:
1. `server` deploy exitoso.
2. `client` deploy exitoso.

## 3) Prerrequisitos (una sola vez)

### GitHub environments
- En ambos repos debe existir `production`.
- `production` debe tener `Required reviewers` activo.

### Secrets de `motoisla-client` (`production`)
- `GH_PAT_CROSS_REPO`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `PROD_API_HEALTH_URL`
- `PROD_FRONTEND_URL` (recomendado)

### Secrets de `motoisla-server` (`production`)
- `RAILWAY_TOKEN` (token de proyecto/servicio valido para deploy)
- `RAILWAY_SERVICE_ID` (servicio API, no DB)
- `RAILWAY_PROJECT_ID`
- `RAILWAY_ENVIRONMENT_ID`
- `PROD_API_HEALTH_URL`

### Variables criticas en Railway (servicio API)
- `DJANGO_DEBUG=False`
- `DJANGO_SECRET_KEY=<segura>`
- `DJANGO_ALLOWED_HOSTS=<hosts reales>`
- `DJANGO_CSRF_TRUSTED_ORIGINS` con esquema (ej. `https://app.motoisla.mx`)
- `DJANGO_CORS_ALLOWED_ORIGINS` con esquema (ej. `https://app.motoisla.mx`)

## 4) Regla de migraciones y datos

Antes de release real, revisar si hay cambios de datos backend:

```bash
cd /Users/pedro412/motoisla-server
git fetch --tags
PREV_TAG=$(git tag -l 'v*' | sort -V | tail -n1)
echo "$PREV_TAG"
git diff --name-only "${PREV_TAG}..main" | grep -E '^apps/.*/migrations/|^apps/.*/models.py|^config/settings.py' || true
```

Si hubo migraciones o cambios de modelos:
1. Asegurar que el deploy de server complete.
2. Ejecutar en Railway:
```bash
railway ssh -s motoisla-server -- sh -lc 'cd /app && python manage.py migrate --noinput'
```
3. Si es un entorno nuevo o faltan catálogos base, correr seeds:
```bash
railway ssh -s motoisla-server -- sh -lc 'cd /app && python manage.py seed_roles'
railway ssh -s motoisla-server -- sh -lc 'cd /app && python manage.py seed_suppliers_parsers'
railway ssh -s motoisla-server -- sh -lc 'cd /app && python manage.py seed_product_taxonomy'
```

## 5) Procedimiento de release (cada feature/sprint)

### Fase A - Preflight
1. Confirmar ambos repos en `main` y limpios.
2. Validar backend prod:
```bash
curl -i "$PROD_API_HEALTH_URL"
```
3. Ejecutar `Release Orchestrator` con `dry_run=true`.
4. Revisar:
- version calculada
- SHA server resuelto
- artefactos de release

### Fase B - Release real
1. Ejecutar `Release Orchestrator` con `dry_run=false`.
2. Aprobar `production` cuando lo pida GitHub:
- primero server
- despues client
3. Confirmar:
- tag `vX.Y.Z` en ambos repos
- GitHub Release creada en client con manifest adjunto

### Fase C - Post-release
1. Si aplica, ejecutar migraciones y seeds (seccion 4).
2. Ejecutar smoke funcional (seccion 6).
3. Documentar resultado en `docs/CHANGELOG_WORK.md`.

## 6) Checklist de verificacion (post-release)

### Backend
- [ ] `GET /health/` => `200`
- [ ] `GET /api/v1/public/catalog/?page=1` => `200`
- [ ] auth JWT login/refresh funcional
- [ ] sin errores 5xx repetitivos en logs

### Frontend
- [ ] `/login` carga
- [ ] `/catalog` carga sin `500`
- [ ] `/api/proxy/public/catalog?page=1` => `200`
- [ ] login admin funcional
- [ ] modulo `/products` carga

### Operacion
- [ ] crear/editar un producto de prueba
- [ ] validar carga de imagen (R2)
- [ ] validar vista en catalogo publico
- [ ] smoke rapido de POS (`create+confirm`)
- [ ] revisar `/ventas` y `/admin/reports`

## 7) Fallos comunes y solucion rapida

### `Reference already exists (HTTP 422)` al crear tag
- Causa: tag huérfano existe en server/client.
- Solucion:
```bash
git -C /Users/pedro412/motoisla-server push origin :refs/tags/vX.Y.Z
git -C /Users/pedro412/motoisla-client push origin :refs/tags/vX.Y.Z
```

### `Falta secret ...`
- Causa: secret no existe en `environment production`.
- Solucion: agregarlo en GitHub Environment (no solo repo secrets).

### `Invalid RAILWAY_TOKEN`
- Causa: token invalido o sin permisos.
- Solucion: rotar token en Railway y actualizar secret `RAILWAY_TOKEN`.

### `Project not found. Run railway link`
- Causa: faltan `RAILWAY_PROJECT_ID` / `RAILWAY_ENVIRONMENT_ID` / `RAILWAY_SERVICE_ID` correctos.
- Solucion: actualizar secrets con IDs del proyecto correcto.

### `CSRF_TRUSTED_ORIGINS missing scheme`
- Causa: origenes sin `https://`.
- Solucion: corregir `DJANGO_CSRF_TRUSTED_ORIGINS` y `DJANGO_CORS_ALLOWED_ORIGINS` con esquema completo.

### Frontend proxy `500` en `/api/proxy/public/catalog`
- Causa habitual: backend devolviendo 500 o `NEXT_PUBLIC_API_BASE_URL` incorrecta en Vercel.
- Solucion: validar backend directo primero, luego redeploy frontend con env vars correctas.

## 8) Rollback
1. Identificar ultimo tag estable `vA.B.C`.
2. Redeploy server al tag estable.
3. Redeploy client al tag estable.
4. Repetir checklist minimo:
- `health`
- `catalog`
- login
5. Registrar incidente y accion correctiva.

## 9) Regla operativa final
- Ninguna release se considera cerrada hasta completar checklist post-release.
- Si falla un punto critico (auth, catalog, POS, ventas), se aborta y se ejecuta rollback.
