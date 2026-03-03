"use client";

import {
  Alert,
  Button,
  Box,
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
import { alpha } from "@mui/material/styles";
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
  const tableHeaderCellSx = {
    backgroundColor: "rgba(15, 23, 42, 0.38)",
    borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
    py: 1.5,
  } as const;

  return (
    <Paper
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: 4,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(17, 24, 39, 0.92) 100%)",
        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.2)",
      }}
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#f8fafc" }}>
              Movimientos de inventario
            </Typography>
            <Typography sx={{ color: "rgba(226, 232, 240, 0.76)" }}>
              Historial reciente de entradas, salidas, ajustes y reservas de este producto.
            </Typography>
          </Box>
          <Typography sx={{ color: "rgba(226, 232, 240, 0.72)" }}>
            Pagina {movementPage} de {totalPages}
          </Typography>
        </Stack>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        {movementsQuery.isLoading ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={20} />
            <Typography sx={{ color: "rgba(226, 232, 240, 0.72)" }}>Cargando movimientos...</Typography>
          </Stack>
        ) : null}

        {!movementsQuery.isLoading && movements.length === 0 ? (
          <Alert severity="info">No hay movimientos registrados para este producto.</Alert>
        ) : null}

        {movements.length > 0 ? (
          <TableContainer
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(148, 163, 184, 0.16)",
              overflowX: "auto",
              background: "linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, rgba(30, 41, 59, 0.34) 100%)",
              backdropFilter: "blur(6px)",
            }}
          >
            <Table
              sx={{
                minWidth: 860,
                backgroundColor: "transparent",
                "& .MuiTableCell-root": {
                  backgroundColor: "transparent",
                  color: "#e2e8f0",
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>
                    <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Fecha
                    </Typography>
                  </TableCell>
                  <TableCell sx={tableHeaderCellSx}>
                    <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Movimiento
                    </Typography>
                  </TableCell>
                  <TableCell sx={tableHeaderCellSx}>
                    <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Cambio
                    </Typography>
                  </TableCell>
                  <TableCell sx={tableHeaderCellSx}>
                    <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Referencia
                    </Typography>
                  </TableCell>
                  <TableCell sx={tableHeaderCellSx}>
                    <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Nota
                    </Typography>
                  </TableCell>
                  <TableCell sx={tableHeaderCellSx}>
                    <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Usuario
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow
                    key={movement.id}
                    hover
                    sx={{
                      "&:hover": {
                        backgroundColor: alpha("#60a5fa", 0.08),
                      },
                      "& > .MuiTableCell-root": {
                        borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
                        py: 1.6,
                      },
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "rgba(226, 232, 240, 0.8)" }}>
                        {formatDateTime(movement.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={formatMovementType(movement.movement_type)}
                        color={getMovementTypeColor(movement.movement_type)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 900, color: "#f8fafc" }}>{formatInventoryDelta(movement.quantity_delta)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                          {formatInventoryReferenceType(movement.reference_type)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(226, 232, 240, 0.65)" }}>
                          Ref: {formatReferenceId(movement.reference_id)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: "#e2e8f0" }}>{movement.note?.trim() ? movement.note : "-"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "#e2e8f0" }}>
                        {movement.created_by_username || movement.created_by}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={() => setMovementPage((current) => current - 1)}
            disabled={movementPage <= 1 || movementsQuery.isLoading}
            sx={{ borderColor: "rgba(148, 163, 184, 0.22)", color: "#e2e8f0" }}
          >
            Anterior
          </Button>
          <Button
            variant="outlined"
            onClick={() => setMovementPage((current) => current + 1)}
            disabled={movementsQuery.isLoading || !movementsQuery.data?.next}
            sx={{ borderColor: "rgba(148, 163, 184, 0.22)", color: "#e2e8f0" }}
          >
            Siguiente
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
