"use client";

import { useRouter } from "next/navigation";
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
  MenuItem,
  Pagination,
  Paper,
  Select,
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

interface Filters {
  dateFrom: string;
  dateTo: string;
  status: string;
  cashier: string;
}

const emptyFilters: Filters = { dateFrom: "", dateTo: "", status: "", cashier: "" };

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return `Hoy, ${new Intl.DateTimeFormat("es-MX", { timeStyle: "short" }).format(date)}`;
  }
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatPaymentLabel(payment: SaleHistoryPayment) {
  if (payment.method === "CASH") return `Efectivo ${formatMoney(payment.amount)}`;
  if (payment.method === "CUSTOMER_CREDIT") return `Saldo a favor ${formatMoney(payment.amount)}`;
  const suffix = payment.card_plan_label || "Tarjeta";
  return `${suffix} ${formatMoney(payment.amount)}`;
}

function statusColor(status: SaleHistoryItem["status"]) {
  if (status === "CONFIRMED") return "success";
  if (status === "VOID") return "error";
  return "default";
}

function statusLabel(status: SaleHistoryItem["status"]) {
  if (status === "CONFIRMED") return "Confirmada";
  if (status === "VOID") return "Cancelada";
  return "Borrador";
}

function hasActiveFilters(f: Filters) {
  return f.dateFrom !== "" || f.dateTo !== "" || f.status !== "" || f.cashier !== "";
}

export default function SalesHistoryPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<SaleHistoryItem | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // draft = lo que el usuario escribe; applied = lo que se envía al backend
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);

  function applyFilters() {
    setPage(1);
    setApplied(draft);
  }

  function clearFilters() {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  }

  const salesQuery = useQuery({
    queryKey: ["sales-history", page, applied],
    queryFn: () =>
      salesService.listSales({
        page,
        date_from: applied.dateFrom || undefined,
        date_to: applied.dateTo || undefined,
        status: applied.status || undefined,
        cashier: applied.cashier || undefined,
      }),
  });

  const totalPages = useMemo(() => {
    if (!salesQuery.data) return 1;
    return Math.max(1, Math.ceil(salesQuery.data.count / pageSize));
  }, [salesQuery.data]);

  async function submitVoid() {
    if (!voidTarget) return;
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

      {/* Filtros */}
      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-end" }} flexWrap="wrap">
          <TextField
            label="Desde"
            type="date"
            size="small"
            value={draft.dateFrom}
            onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            label="Hasta"
            type="date"
            size="small"
            value={draft.dateTo}
            onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <Select
            displayEmpty
            size="small"
            value={draft.status}
            onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Todos los estatus</MenuItem>
            <MenuItem value="CONFIRMED">Confirmada</MenuItem>
            <MenuItem value="VOID">Cancelada</MenuItem>
            <MenuItem value="DRAFT">Borrador</MenuItem>
          </Select>
          <TextField
            label="Cajero"
            size="small"
            placeholder="usuario..."
            value={draft.cashier}
            onChange={(e) => setDraft((prev) => ({ ...prev, cashier: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
            sx={{ minWidth: 160 }}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" size="small" onClick={applyFilters} sx={{ fontWeight: 700 }}>
              Buscar
            </Button>
            {hasActiveFilters(applied) && (
              <Button variant="outlined" size="small" onClick={clearFilters}>
                Limpiar
              </Button>
            )}
          </Stack>
        </Stack>
        {hasActiveFilters(applied) && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
            {salesQuery.data ? `${salesQuery.data.count} resultado${salesQuery.data.count !== 1 ? "s" : ""}` : "Buscando…"}
          </Typography>
        )}
      </Paper>

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
        <Alert severity="info">
          {hasActiveFilters(applied) ? "No hay ventas que coincidan con los filtros." : "Todavía no hay ventas registradas."}
        </Alert>
      ) : null}

      {salesQuery.data?.results.length ? (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Cliente</TableCell>
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
                  <TableRow
                    key={sale.id}
                    hover
                    onClick={() => router.push(`/ventas/${sale.id}`)}
                    sx={{
                      cursor: "pointer",
                      "& > .MuiTableCell-root": { transition: "background-color 120ms ease" },
                    }}
                  >
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography fontWeight={700} variant="body2">
                        {formatDateTime(sale.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <Typography fontWeight={700} variant="body2">
                        {sale.customer_name || "Mostrador"}
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        {sale.customer_phone || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{sale.cashier_username}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={statusLabel(sale.status)} size="small" color={statusColor(sale.status)} />
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
                        <Typography color="text.secondary" variant="body2">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {sale.can_void ? (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setVoidTarget(sale);
                            setVoidReason("");
                            setErrorMessage(null);
                          }}
                          sx={{ fontWeight: 700 }}
                        >
                          Cancelar
                        </Button>
                      ) : (
                        <Typography color="text.secondary" variant="body2">-</Typography>
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
          if (isVoiding) return;
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
              if (isVoiding) return;
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
