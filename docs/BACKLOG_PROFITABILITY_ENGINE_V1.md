# Backlog P1 - Profitability Engine v1 (Costo Operativo en Tiempo Real + Reparto Neto)

## Contexto de negocio
- El modelo actual de reparto con inversionistas puede generar payout superior a la utilidad real por venta.
- Cuando no se descuenta costo operativo real por venta, la tienda puede terminar subsidiando la utilidad del inversionista.
- Se requiere un cálculo consistente, auditable y en tiempo real para proteger margen operativo.

## Regla operativa oficial
> Primero se paga la casa (gastos operativos), luego se recupera el costo, y al final lo que sobre se reparte.

## Objetivo de esta iniciativa
- Implementar un motor de utilidad neta por venta que calcule y congele (snapshot) el costo operativo aplicado, y ejecute reparto automático a inversionistas solo sobre utilidad neta real.

## Decisiones cerradas
1. Método híbrido para tasa operativa.
2. Inclusión de comisión de tarjeta como costo directo de la venta.
3. Snapshot inmutable al confirmar venta.
4. Prorrateo por ingreso en ventas mixtas (líneas propias + líneas de inversionista).
5. Si neto inversionista `<= 0`, no se genera `PROFIT_SHARE`.

## Fórmulas (venta y línea)

### Venta (nivel total)
1. `sale_revenue = subtotal - descuentos`
2. `operating_cost_amount = sale_revenue * operating_cost_rate_snapshot`
3. `commission_amount = suma(comisiones de pagos CARD de la venta)`
4. `gross_profit_total = sale_revenue - cogs_total`
5. `net_profit_total = sale_revenue - cogs_total - operating_cost_amount - commission_amount`

### Línea (para ventas mixtas y reparto)
1. `line_revenue = qty * unit_price * (1 - discount_pct)`
2. `line_operating_cost = operating_cost_amount * (line_revenue / sale_revenue)`
3. `line_commission_cost = commission_amount * (line_revenue / sale_revenue)`
4. `line_net_profit = line_revenue - line_cogs - line_operating_cost - line_commission_cost`
5. Si línea es de inversionista:
- `investor_profit = max(0, line_net_profit * investor_share_rate)`
- `store_profit = line_net_profit - investor_profit`
6. Si línea es propia:
- `store_profit = line_net_profit`

### Redondeo
- Redondeo monetario a 2 decimales.
- Ajuste de residuo por redondeo en la última línea de cada bloque para mantener consistencia con el total de venta.

## Método híbrido para costo operativo en tiempo real
- Base principal: MTD (mes actual) con gastos pagados y ventas confirmadas.
- `operating_cost_rate_raw = paid_expenses_mtd / confirmed_sales_mtd`
- Fallback a tasa base configurable (ej. `0.175`) cuando no exista volumen mínimo para estabilidad estadística.
- Guardar en snapshot:
1. `operating_cost_rate_snapshot`
2. `rate_source` (`MTD_REAL` o `FALLBACK_BASE`)
3. fecha/hora del cálculo.

## APIs, interfaces y tipos propuestos (documentados, no implementados)

### APIs nuevas propuestas
1. `POST /sales/preview-profitability/`
- Simula utilidad neta y reparto antes de confirmar.
2. `GET /profitability/operating-cost-rate/`
- Devuelve tasa vigente, fuente y metadatos del cálculo.

### Extensiones propuestas
1. `POST /sales/{id}/confirm/`
- Debe devolver snapshot financiero final (venta + líneas + split).
2. `GET /sales/{id}/`
- Debe incluir snapshot persistido de rentabilidad.

### Contratos frontend propuestos
1. `SaleProfitabilityBreakdown`
2. `SaleLineProfitability`
3. `rate_source` con enum `MTD_REAL | FALLBACK_BASE`

### Métricas nuevas propuestas en reportes
1. `operating_cost_rate_avg`
2. `operating_cost_total_allocated`
3. `fallback_usage_count`

## Requisitos por fase (v1)

### Backend
- Motor de cálculo en confirmación de venta.
- Persistencia de snapshot inmutable por venta y por línea.
- Posting automático de `PROFIT_SHARE` en ledger de inversionistas.
- Idempotencia de posting para evitar duplicados por reintentos.
- Endpoint de preview para POS.

### Frontend
- POS: panel de preview de rentabilidad antes de cobrar.
- Detalle de venta: visualización del snapshot final.
- Reportes: exposición de nuevas métricas de tasa/costo operativo.
- Tipado estricto para nuevos contratos sin romper flujos actuales.

## Riesgos y reglas de idempotencia
- Riesgo: duplicar `PROFIT_SHARE` en retries o reconfirmaciones.
- Regla: usar llave idempotente por `sale_id + investor_id + entry_type`.
- Riesgo: discrepancias por redondeo.
- Regla: reconciliación de residuo en última línea.
- Riesgo: variación de tasa operativa por baja muestra.
- Regla: fallback configurable y auditoría de `rate_source`.

## Criterios de aceptación y casos de prueba
1. Venta respaldada por inversionista no puede generar payout mayor al neto real de la línea.
2. Si neto de línea inversionista `<= 0`, `investor_profit = 0` y no se postea `PROFIT_SHARE`.
3. Ventas mixtas prorratean costo operativo y comisión por ingreso de línea.
4. Snapshot de venta no cambia después de confirmación.
5. Reintento de confirmación no duplica movimientos de ledger.
6. Reportes muestran nuevas métricas y cuadran con snapshots.

## Checklist de rollout y monitoreo
1. Activar con feature flag en backend.
2. Probar en staging con datos reales de operación.
3. Monitorear:
- porcentaje de fallback (`fallback_usage_count`)
- neto promedio por venta inversionista
- cantidad de ventas con neto inversionista `<= 0`
- errores/idempotencia de posting a ledger
4. Habilitación progresiva por entorno hasta producción.

## Dependencias con `motoisla-server`
- La mayor parte de la lógica vive en backend (`motoisla-server`) porque el cálculo final y el ledger deben ser fuente única de verdad.
- El frontend depende de:
1. nuevos endpoints
2. respuestas extendidas de venta
3. nuevas métricas en reportes
- Este documento describe contratos propuestos para coordinar la implementación cross-repo.

## Alcance explícito de este backlog
- Esta entrega es documental (backlog + especificación), sin cambios productivos de runtime en frontend o backend.

