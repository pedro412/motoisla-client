# Next Steps (Prioritized)

## P1 - Operación crítica
1. Agregar navegación por teclado al buscador de `Nueva Venta` (`ArrowDown`, `Enter`, `Esc`).
2. Mostrar errores de create vs confirm de venta con resolución más guiada cuando una venta queda en `DRAFT`.
3. Agregar filtros en `/ventas` (estatus, cajero, fecha e ID).
4. Ajustar UX de compras para edición masiva de líneas y guardado por lote.
5. Extender parser cliente a proveedores adicionales además de MYESA.

## P2 - QA funcional
1. E2E completo de:
- login -> buscar producto -> cobrar venta -> validar cambio -> cancelación desde `/ventas`
- reporte por rango con datos esperados
- compras -> parse factura MYESA -> editar -> confirmar.
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
5. Carga de imagen por línea en preview de compras.
6. Deprecar en backend el parse remoto legacy cuando el flujo local esté estabilizado.
