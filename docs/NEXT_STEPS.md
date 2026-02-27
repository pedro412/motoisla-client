# Next Steps (Prioritized)

## P1 - Operación crítica
1. Extender POS con manejo detallado de `fields` por error backend.
2. Agregar validaciones cliente para reducir roundtrips fallidos:
- `payments sum == total`
- reglas `CARD`/`card_type`
- restricciones de descuento para cashier.
3. Agregar feedback post-confirm (estado final + limpieza de carrito).

## P2 - QA funcional
1. E2E completo de:
- login -> create sale -> confirm -> void
- reporte por rango con datos esperados.
2. Verificación cruzada con `motoisla-server/docs/API_QA_COLLECTION.http`.

## P3 - Hardening
1. Error boundary global y estrategia de logging frontend.
2. Skeletons y estados vacíos compartidos para todas las vistas.
3. Mejorar telemetría de errores para debugging en local/staging.

## P4 - Backlog funcional (fuera de sprint)
1. UI de gastos (`expenses`).
2. UI de apartados (`layaway`).
3. UI de inversionistas/ledger (`investors`).
4. Multipago POS.
