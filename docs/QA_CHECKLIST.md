# QA Checklist (Local)

## Auth
- [ ] Login válido crea sesión.
- [ ] Logout limpia sesión y bloquea rutas privadas.
- [ ] Refresh funciona cuando expira access token.

## Catalog
- [ ] `/catalog` carga lista pública.
- [ ] búsqueda por `q` devuelve resultados.
- [ ] `/catalog/{sku}` muestra detalle.

## POS
- [ ] `/pos` muestra buscador dropdown y se cierra al perder foco.
- [ ] `Cobrar` abre modal de checkout con efectivo/tarjeta.
- [ ] efectivo sugiere montos rápidos y calcula cambio correcto.
- [ ] cobro exitoso crea + confirma la venta y muestra modal success.
- [ ] errores backend (`code/detail/fields`) se muestran correctamente.

## Ventas
- [ ] `/ventas` carga tabla paginada.
- [ ] cancelación desde tabla respeta permisos y ventana.
- [ ] motivo de cancelación se muestra cuando la venta está en `VOID`.

## Reports
- [ ] `/admin/reports` responde con filtros de rango.
- [ ] muestra total sales, avg ticket y top products.
- [ ] muestra neto después de gastos.

## Purchases
- [ ] `/purchases/imports` carga proveedores y parsers.
- [ ] parse de factura MYESA genera preview editable.
- [ ] `precio_publico` y margen se actualizan en tiempo real.
- [ ] confirmación de compra devuelve `purchase_receipt_id`.
- [ ] stock incrementa después de confirmar.

## Guards
- [ ] usuario sin sesión no entra a `/pos` ni `/admin/*`.
- [ ] `CASHIER` no accede a `/admin/reports`.
