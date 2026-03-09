# R2 Production Checklist (Client)

Checklist para no olvidar pasos al desplegar frontend con imagenes servidas desde Cloudflare R2.

## 1) Configurar bucket para produccion
- Crear bucket dedicado de prod (no reutilizar el de pruebas).
- Definir URL publica estable:
  - Opcion recomendada: dominio propio (`media.tudominio.com`).
  - Opcion rapida: URL publica `r2.dev`.
- Confirmar que el bucket sea accesible por `GET/HEAD` para storefront.

## 2) Configurar CORS de R2 para upload directo
- Origenes permitidos:
  - `https://admin.tudominio.com`
  - `https://staging-admin.tudominio.com` (si aplica)
  - `http://localhost:3000` solo para desarrollo.
- Metodos: `GET`, `HEAD`, `PUT`.
- Headers: `*`.
- Exponer header: `ETag`.

Ejemplo:

```json
[
  {
    "AllowedOrigins": [
      "https://admin.tudominio.com",
      "https://staging-admin.tudominio.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## 3) Variables de entorno frontend
- `NEXT_PUBLIC_API_BASE_URL=https://api.tudominio.com/api/v1`
- `NEXT_PUBLIC_MEDIA_MAX_BYTES=8388608`
- `NEXT_PUBLIC_MEDIA_MAX_DIMENSION=3000`
- `NEXT_PUBLIC_MEDIA_BASE_URL=https://media.tudominio.com`

Notas:
- `NEXT_PUBLIC_MEDIA_BASE_URL` debe coincidir con la URL publica real del bucket.
- Si cambias dominio de media, actualizar esta variable y redeploy.

## 4) Next.js image allowlist
- Mantener `images.remotePatterns` en `next.config.ts` con:
  - host de `NEXT_PUBLIC_MEDIA_BASE_URL`
  - host de `NEXT_PUBLIC_API_BASE_URL` (fallback para media servida por API)

## 5) Smoke test obligatorio despues de deploy
1. Crear producto en panel `/products`.
2. Subir imagen valida (JPEG/PNG/WebP).
3. Verificar miniatura en listado interno.
4. Verificar imagen en detalle interno.
5. Verificar imagen en catalogo publico `/catalog`.
6. Verificar imagen en detalle publico `/catalog/[sku]`.

## 6) Señales de falla comunes
- Error CORS al subir (`PUT` bloqueado): revisar CORS en bucket.
- Imagen no carga en frontend: revisar `images.remotePatterns` y dominio real de media.
- Error de validacion local: revisar peso/dimensiones contra variables `NEXT_PUBLIC_MEDIA_*`.

## 7) Regla operativa para cambios de entorno
- Staging y prod usan buckets separados.
- No compartir llaves ni bucket entre ambientes.
- Probar primero en staging y luego promover a prod.
