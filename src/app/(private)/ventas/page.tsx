"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import type { SaleHistoryItem, SaleHistoryPayment } from "@/lib/types/sales";
import { salesService } from "@/modules/sales/services/sales.service";

const pageSize = 20;

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPaymentLabel(payment: SaleHistoryPayment) {
  if (payment.method === "CASH") {
    return `Efectivo ${formatMoney(payment.amount)}`;
  }
  const suffix = payment.card_plan_label || "Tarjeta";
  return `${suffix} ${formatMoney(payment.amount)}`;
}

function statusColor(status: SaleHistoryItem["status"]) {
  if (status === "CONFIRMED") {
    return "success";
  }
  if (status === "VOID") {
    return "error";
  }
  return "default";
}

export default function SalesHistoryPage() {
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<SaleHistoryItem | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  const salesQuery = useQuery({
    queryKey: ["sales-history", page],
    queryFn: () => salesService.listSales({ page }),
  });

  const totalPages = useMemo(() => {
    if (!salesQuery.data) {
      return 1;
    }
    return Math.max(1, Math.ceil(salesQuery.data.count / pageSize));
  }, [salesQuery.data]);

  async function submitVoid() {
    if (!voidTarget) {
      return;
    }

    const reason = voidReason.trim();
    if (!reason) {
      setErrorMessage("Debes capturar el motivo de cancelación.");
      return;
    }

    setIsVoiding(true);
    setErrorMessage(null);
    try {
      await salesService.voidSale(voidTarget.id, reason);
      setVoidTarget(null);
      setVoidReason("");
      await salesQuery.refetch();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible cancelar la venta.");
      }
    } finally {
      setIsVoiding(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Ventas</Typography>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {salesQuery.isLoading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {salesQuery.isError ? (
        <Alert severity="error">No fue posible cargar el historial de ventas.</Alert>
      ) : null}

      {!salesQuery.isLoading && salesQuery.data && salesQuery.data.results.length === 0 ? (
        <Alert severity="info">Todavía no hay ventas registradas.</Alert>
      ) : null}

      {salesQuery.data?.results.length ? (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Cajero</TableCell>
                  <TableCell>Estatus</TableCell>
                  <TableCell>Pagos</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Motivo cancelación</TableCell>
                  <TableCell align="right">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesQuery.data.results.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography fontWeight={700} variant="body2">
                        {formatDateTime(sale.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {sale.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{sale.cashier_username}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={sale.status} size="small" color={statusColor(sale.status)} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Typography color="text.secondary" variant="body2">
                        {sale.payments.map((payment) => formatPaymentLabel(payment)).join(" · ")}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography fontWeight={800}>{formatMoney(sale.total)}</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      {sale.void_reason ? (
                        <Typography color="error.main" variant="body2">
                          {sale.void_reason}
                        </Typography>
                      ) : (
                        <Typography color="text.secondary" variant="body2">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {sale.can_void ? (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => {
                            setVoidTarget(sale);
                            setVoidReason("");
                            setErrorMessage(null);
                          }}
                        >
                          Cancelar
                        </Button>
                      ) : (
                        <Typography color="text.secondary" variant="body2">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}

      <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
        <Pagination count={totalPages} page={page} onChange={(_, nextPage) => setPage(nextPage)} color="primary" />
      </Box>

      <Dialog
        open={Boolean(voidTarget)}
        onClose={() => {
          if (isVoiding) {
            return;
          }
          setVoidTarget(null);
          setVoidReason("");
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Cancelar venta</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary" variant="body2">
              Venta: {voidTarget?.id}
            </Typography>
            <TextField
              label="Motivo"
              value={voidReason}
              onChange={(event) => setVoidReason(event.target.value)}
              required
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (isVoiding) {
                return;
              }
              setVoidTarget(null);
              setVoidReason("");
            }}
          >
            Cerrar
          </Button>
          <Button onClick={submitVoid} color="error" variant="contained" disabled={isVoiding}>
            Confirmar cancelación
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
