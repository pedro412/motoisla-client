"use client";

import { useParams } from "next/navigation";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
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
  Divider,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { DetailPageHeader } from "@/components/common/detail-page-header";
import { MoneyInput } from "@/components/forms/money-input";
import { layawayService } from "@/modules/layaway/services/layaway.service";
import { salesService } from "@/modules/sales/services/sales.service";
import type { PaymentMethod } from "@/lib/types/sales";
import type { LayawayDetailResponse } from "@/lib/types/layaway";
import { buildLayawayTicketBytes } from "@/lib/print/escpos";
import { printViaUSB } from "@/lib/print/usb-printer";
import { usePrinterStore } from "@/store/printer-store";

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "ACTIVE") {
    return "Activo";
  }
  if (status === "SETTLED") {
    return "Liquidado";
  }
  if (status === "EXPIRED") {
    return "Vencido";
  }
  if (status === "REFUNDED") {
    return "Reembolsado";
  }
  return status;
}

export default function LayawayDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [selectedCardPlanId, setSelectedCardPlanId] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [printData, setPrintData] = useState<{
    layaway: LayawayDetailResponse;
    type: "abono" | "liquidated";
    abonoAmount?: number;
    abonoMethod?: string;
  } | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const { setStatus: setPrinterStatus, charWidth, storeAddress, storePhone } = usePrinterStore();

  async function doPrint(data: { layaway: LayawayDetailResponse; type: "abono" | "liquidated"; abonoAmount?: number; abonoMethod?: string }) {
    try {
      await printViaUSB(buildLayawayTicketBytes(data.layaway, data.type, { charWidth, storeAddress, storePhone, abonoAmount: data.abonoAmount, abonoMethod: data.abonoMethod }));
      setPrinterStatus("ok");
    } catch { setPrinterStatus("error"); }
  }

  const layawayQuery = useQuery({
    queryKey: ["layaway", id],
    queryFn: () => layawayService.getLayaway(id),
  });
  const cardPlansQuery = useQuery({
    queryKey: ["card-commission-plans"],
    queryFn: () => salesService.listCardCommissionPlans(),
    staleTime: 60_000,
  });

  const cardPlans = useMemo(() => cardPlansQuery.data?.results ?? [], [cardPlansQuery.data?.results]);
  const selectedCardPlan = useMemo(
    () => cardPlans.find((plan) => plan.id === selectedCardPlanId) ?? cardPlans[0] ?? null,
    [cardPlans, selectedCardPlanId],
  );

  useEffect(() => {
    if (paymentMethod !== "CARD") {
      return;
    }
    if (!selectedCardPlanId && cardPlans.length > 0) {
      setSelectedCardPlanId(cardPlans[0].id);
    }
  }, [cardPlans, paymentMethod, selectedCardPlanId]);

  useEffect(() => {
    if (!printData) return;
    const t = setTimeout(() => doPrint(printData), 200);
    setSnackbarOpen(true);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printData]);

  async function submitPayment() {
    if (!layawayQuery.data) {
      return;
    }
    const dueValue = Number(layawayQuery.data.balance_due);
    const paymentAmount = Math.max(Number(amount || 0), 0);
    if (paymentAmount <= 0) {
      setErrorMessage("Debes capturar un monto de abono.");
      return;
    }
    if (paymentAmount > dueValue) {
      setErrorMessage("El abono no puede exceder el saldo pendiente.");
      return;
    }
    if (paymentMethod === "CARD" && !selectedCardPlan) {
      setErrorMessage("Debes seleccionar un plan de comisión para tarjeta.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const payments = [
        {
          method: paymentMethod,
          amount: paymentAmount.toFixed(2),
          card_plan_id: paymentMethod === "CARD" ? selectedCardPlan?.id : undefined,
        },
      ];
      let result: LayawayDetailResponse;
      if (paymentAmount >= dueValue) {
        result = await layawayService.settleLayaway(id, { payments });
        setPrintData({ layaway: result, type: "liquidated" });
      } else {
        result = await layawayService.addPayments(id, { payments });
        setPrintData({ layaway: result, type: "abono", abonoAmount: paymentAmount, abonoMethod: paymentMethod });
      }
      setPaymentOpen(false);
      setAmount("");
      setPaymentMethod("CASH");
      setSelectedCardPlanId("");
      await layawayQuery.refetch();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible registrar el abono.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function submitExtend() {
    if (!newExpiresAt) {
      setErrorMessage("Debes capturar la nueva fecha.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await layawayService.extendLayaway(id, {
        new_expires_at: new Date(`${newExpiresAt}T23:59:00`).toISOString(),
        reason: extendReason.trim() || undefined,
      });
      setExtendOpen(false);
      setNewExpiresAt("");
      setExtendReason("");
      await layawayQuery.refetch();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible extender el apartado.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function expireNow() {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await layawayService.expireLayaway(id, { force: true });
      await layawayQuery.refetch();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible vencer el apartado.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (layawayQuery.isLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (layawayQuery.isError || !layawayQuery.data) {
    return <Alert severity="error">No fue posible cargar el apartado.</Alert>;
  }

  const layaway = layawayQuery.data;
  const dueAmount = Number(layaway.balance_due);
  const paymentAmount = Math.min(Math.max(Number(amount || 0), 0), dueAmount);
  const remainingAfterPayment = Math.max(dueAmount - paymentAmount, 0);
  const settlesLayaway = paymentAmount >= dueAmount && dueAmount > 0;
  const estimatedCommission = paymentMethod === "CARD" && selectedCardPlan ? paymentAmount * Number(selectedCardPlan.commission_rate) : 0;

  return (
    <Stack spacing={3}>
      <DetailPageHeader
        breadcrumbs={[
          { label: "Apartados", href: "/apartados" },
          { label: "Detalle de apartado" },
        ]}
        backHref="/apartados"
        title="Detalle de apartado"
        description="Consulta saldos, vigencia y movimientos de este apartado."
      />
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="h6">{layaway.customer_name}</Typography>
              <Typography color="text.secondary">{layaway.customer_phone}</Typography>
            </Stack>
            <Chip
              label={statusLabel(layaway.status)}
              color={
                layaway.status === "SETTLED"
                  ? "success"
                  : layaway.status === "EXPIRED"
                    ? "error"
                    : layaway.status === "REFUNDED"
                      ? "info"
                      : "warning"
              }
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <Typography>Total: {formatMoney(layaway.total)}</Typography>
            <Typography>Pagado: {formatMoney(layaway.amount_paid)}</Typography>
            <Typography>Pendiente: {formatMoney(layaway.balance_due)}</Typography>
            <Typography>Saldo a favor cliente: {formatMoney(layaway.customer_credit_balance)}</Typography>
          </Stack>

          <Typography>Vence: {formatDate(layaway.expires_at)}</Typography>
          {layaway.notes ? <Typography color="text.secondary">Notas: {layaway.notes}</Typography> : null}

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Button variant="contained" onClick={() => setPaymentOpen(true)} disabled={layaway.status !== "ACTIVE" || submitting}>
              Registrar abono
            </Button>
            <Button variant="outlined" onClick={() => setExtendOpen(true)} disabled={layaway.status !== "ACTIVE" || submitting}>
              Extender fecha
            </Button>
            <Button variant="outlined" color="error" onClick={expireNow} disabled={layaway.status !== "ACTIVE" || submitting}>
              Vencer ahora
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Productos</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell align="right">Precio</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {layaway.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.product_name ?? line.product_sku ?? line.product}</TableCell>
                  <TableCell align="right">{line.qty}</TableCell>
                  <TableCell align="right">{formatMoney(line.unit_price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Abonos</Typography>
          {layaway.payments.length === 0 ? <Typography color="text.secondary">Aún no hay abonos.</Typography> : null}
          {layaway.payments.map((payment) => (
            <Stack key={payment.id} spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography>{payment.method}</Typography>
                <Typography fontWeight={800}>{formatMoney(payment.amount)}</Typography>
              </Stack>
              <Typography color="text.secondary" variant="body2">
                {formatDate(payment.created_at)}
              </Typography>
              <Divider />
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar abono</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography color="text.secondary" variant="body2">
                    Saldo pendiente actual
                  </Typography>
                  <Typography fontWeight={900}>{formatMoney(dueAmount)}</Typography>
                </Stack>
                <Typography color="text.secondary" variant="body2">
                  Captura el monto del abono y selecciona cómo se está pagando hoy.
                </Typography>
              </Stack>
            </Paper>

            <MoneyInput
              label="Monto del abono"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              helperText="Importe que vas a registrar en este movimiento."
              fullWidth
            />

            <TextField
              select
              label="Forma de pago"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              fullWidth
            >
              <MenuItem value="CASH">Efectivo</MenuItem>
              <MenuItem value="CARD">Tarjeta</MenuItem>
            </TextField>

            {paymentMethod === "CARD" ? (
              <Stack spacing={1.5}>
                <TextField
                  select
                  label="Plan de tarjeta"
                  value={selectedCardPlan?.id ?? ""}
                  onChange={(event) => setSelectedCardPlanId(event.target.value)}
                  fullWidth
                  disabled={cardPlansQuery.isLoading || cardPlans.length === 0}
                >
                  {cardPlans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {plan.label}
                    </MenuItem>
                  ))}
                </TextField>

                {cardPlansQuery.isError ? (
                  <Alert severity="error">No fue posible cargar los planes de comisión de tarjeta.</Alert>
                ) : null}

                {selectedCardPlan ? (
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography color="text.secondary" variant="body2">
                      Comisión estimada
                    </Typography>
                    <Typography fontWeight={800}>
                      {formatMoney(estimatedCommission)} ({(Number(selectedCardPlan.commission_rate) * 100).toFixed(2)}%)
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            ) : null}

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography color="text.secondary" variant="body2">
                    Abono total a registrar
                  </Typography>
                  <Typography fontWeight={800}>{formatMoney(paymentAmount)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography color="text.secondary" variant="body2">
                    Pendiente después de este movimiento
                  </Typography>
                  <Typography fontWeight={800}>{formatMoney(remainingAfterPayment)}</Typography>
                </Stack>
                <Alert severity={settlesLayaway ? "success" : "info"}>
                  {settlesLayaway
                    ? "Este movimiento liquida el apartado y cerrará la venta."
                    : "Este movimiento registra un abono parcial; el apartado seguirá activo."}
                </Alert>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submitPayment} variant="contained" disabled={submitting}>
            {settlesLayaway ? "Liquidar apartado" : "Registrar abono"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={extendOpen} onClose={() => setExtendOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Extender apartado</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nueva fecha límite"
              type="date"
              value={newExpiresAt}
              onChange={(event) => setNewExpiresAt(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Motivo"
              value={extendReason}
              onChange={(event) => setExtendReason(event.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtendOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submitExtend} variant="contained" disabled={submitting}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={8000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message={printData?.type === "liquidated" ? "Apartado liquidado" : "Abono registrado"}
        action={
          <Button color="inherit" size="small" startIcon={<PrintRoundedIcon />} onClick={() => printData && doPrint(printData)}>
            Reimprimir
          </Button>
        }
      />
    </Stack>
  );
}
