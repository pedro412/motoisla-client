"use client";

import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { inventoryService } from "@/modules/inventory/services/inventory.service";
import {
  formatInventoryDelta,
  formatInventoryReferenceType,
  formatMovementType,
  formatReferenceId,
  getMovementTypeColor,
} from "@/modules/inventory/utils";
import { formatDateTime } from "@/modules/products/utils";

const PAGE_SIZE = 20;

interface ProductMovementsTableProps {
  productId: string;
}

export function ProductMovementsTable({ productId }: ProductMovementsTableProps) {
  const [movementPage, setMovementPage] = useState(1);

  const movementsQuery = useQuery({
    queryKey: ["inventory-movements", productId, movementPage],
    queryFn: () => inventoryService.listMovements({ product: productId, page: movementPage }),
    enabled: Boolean(productId),
  });

  const errorMessage = useMemo(() => {
    if (!movementsQuery.error) {
      return null;
    }

    if (movementsQuery.error instanceof ApiError) {
      return movementsQuery.error.detail;
    }

    return "No fue posible cargar los movimientos de inventario.";
  }, [movementsQuery.error]);

  const movements = movementsQuery.data?.results ?? [];
  const totalPages = Math.max(1, Math.ceil((movementsQuery.data?.count ?? 0) / PAGE_SIZE));

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
          <div>
            <Typography variant="h6">Movimientos de inventario</Typography>
            <Typography color="text.secondary">Historial reciente de entradas, salidas, ajustes y reservas de este producto.</Typography>
          </div>
          <Typography color="text.secondary">
            Pagina {movementPage} de {totalPages}
          </Typography>
        </Stack>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        {movementsQuery.isLoading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={20} />
            <Typography>Cargando movimientos...</Typography>
          </Stack>
        ) : null}

        {!movementsQuery.isLoading && movements.length === 0 ? (
          <Alert severity="info">No hay movimientos registrados para este producto.</Alert>
        ) : null}

        {movements.length > 0 ? (
          <TableContainer>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Movimiento</TableCell>
                  <TableCell>Cambio</TableCell>
                  <TableCell>Referencia</TableCell>
                  <TableCell>Nota</TableCell>
                  <TableCell>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id} hover>
                    <TableCell>{formatDateTime(movement.created_at)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={formatMovementType(movement.movement_type)}
                        color={getMovementTypeColor(movement.movement_type)}
                      />
                    </TableCell>
                    <TableCell>{formatInventoryDelta(movement.quantity_delta)}</TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2">{formatInventoryReferenceType(movement.reference_type)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Ref: {formatReferenceId(movement.reference_id)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{movement.note?.trim() ? movement.note : "-"}</TableCell>
                    <TableCell>{movement.created_by_username || movement.created_by}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => setMovementPage((current) => current - 1)} disabled={movementPage <= 1 || movementsQuery.isLoading}>
            Anterior
          </Button>
          <Button
            variant="outlined"
            onClick={() => setMovementPage((current) => current + 1)}
            disabled={movementsQuery.isLoading || !movementsQuery.data?.next}
          >
            Siguiente
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
