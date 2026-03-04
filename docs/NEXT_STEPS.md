# Next Steps (Prioritized)

## P1 - Operación crítica
1. Implementar motor de utilidad neta por venta + reparto automático a inversionistas con snapshot inmutable. Ver `docs/BACKLOG_PROFITABILITY_ENGINE_V1.md`.
2. Agregar navegación por teclado al buscador de `Nueva Venta` (`ArrowDown`, `Enter`, `Esc`).
3. Mostrar errores de create vs confirm de venta con resolución más guiada cuando una venta queda en `DRAFT`.
4. Agregar filtros en `/ventas` (estatus, cajero, fecha e ID).
5. Endurecer concurrencia del flujo `investors` (evitar sobreasignación por compras simultáneas).
6. Agregar detalle de cliente con historial de compras ligado por teléfono.
7. Ajustar UX de compras para edición masiva de líneas y guardado por lote.
8. Extender parser cliente a proveedores adicionales además de MYESA.
9. Agregar comparativos en `Reportes` contra periodo anterior y drill-down de métricas tienda vs inversionistas.

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
1. Reinversión y filtros avanzados dentro de `investors`.
2. Multipago POS.
3. Carga de imagen por línea en preview de compras.
4. Deprecar en backend el parse remoto legacy cuando el flujo local esté estabilizado.
5. Programa de lealtad por cliente usando historial de compras y teléfono como identidad.
6. Reimpresión de ticket desde detalle de venta y cierre de caja.
