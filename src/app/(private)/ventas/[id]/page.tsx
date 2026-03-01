"use client";

import { useParams } from "next/navigation";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import { salesService } from "@/modules/sales/services/sales.service";
import type { SalePaymentInput, SaleResponse } from "@/lib/types/sales";

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusColor(status: SaleResponse["status"]) {
  if (status === "CONFIRMED") {
    return "success";
  }
  if (status === "VOID") {
    return "error";
  }
  return "default";
}

function statusLabel(status: SaleResponse["status"]) {
  if (status === "CONFIRMED") {
    return "Confirmada";
  }
  if (status === "VOID") {
    return "Cancelada";
  }
  return "Borrador";
}

function paymentLabel(payment: SalePaymentInput) {
  if (payment.method === "CASH") {
    return "Efectivo";
  }
  if (payment.method === "CUSTOMER_CREDIT") {
    return "Saldo a favor";
  }
  return payment.card_plan_label || "Tarjeta";
}

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);

  const saleQuery = useQuery({
    queryKey: ["sale-detail", id],
    queryFn: () => salesService.getSale(id),
  });

  if (saleQuery.isLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (saleQuery.isError || !saleQuery.data) {
    return <Alert severity="error">No fue posible cargar el detalle de la venta.</Alert>;
  }

  const sale = saleQuery.data;

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Detalle de venta</Typography>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                ID de venta
              </Typography>
              <Typography sx={{ fontFamily: "monospace", fontWeight: 700 }}>{sale.id}</Typography>
            </Stack>
            <Chip label={statusLabel(sale.status)} color={statusColor(sale.status)} />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <Typography>Cajero: <strong>{sale.cashier_username}</strong></Typography>
            <Typography>Creada: <strong>{formatDateTime(sale.created_at)}</strong></Typography>
            <Typography>Confirmada: <strong>{formatDateTime(sale.confirmed_at)}</strong></Typography>
          </Stack>

          <Divider />

          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Cliente
            </Typography>
            {sale.customer_summary ? (
              <>
                <Typography fontWeight={700}>{sale.customer_summary.name}</Typography>
                <Typography color="text.secondary">{sale.customer_summary.phone}</Typography>
                <Typography variant="body2">
                  Compras registradas: <strong>{sale.customer_summary.sales_count}</strong> · Confirmadas:{" "}
                  <strong>{sale.customer_summary.confirmed_sales_count}</strong>
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary">Venta de mostrador</Typography>
            )}
          </Stack>

          <Divider />

          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <Typography>Subtotal: <strong>{formatMoney(sale.subtotal)}</strong></Typography>
            <Typography>Descuento: <strong>{formatMoney(sale.discount_amount)}</strong></Typography>
            <Typography>Total: <strong>{formatMoney(sale.total)}</strong></Typography>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Productos vendidos</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell align="right">Precio unitario</TableCell>
                <TableCell align="right">Descuento</TableCell>
                <TableCell align="right">Importe</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sale.lines.map((line) => {
                const lineTotal = Number(line.qty) * Number(line.unit_price) * (1 - Number(line.discount_pct) / 100);
                return (
                  <TableRow key={`${line.product}-${line.qty}-${line.unit_price}`}>
                    <TableCell>
                      <Typography fontWeight={700}>{line.product_name ?? line.product_sku ?? line.product}</Typography>
                      <Typography color="text.secondary" variant="caption">
                        {line.product_sku ?? line.product}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{line.qty}</TableCell>
                    <TableCell align="right">{formatMoney(line.unit_price)}</TableCell>
                    <TableCell align="right">{Number(line.discount_pct).toFixed(2)}%</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={800}>{formatMoney(lineTotal)}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Métodos de pago</Typography>
          {sale.payments.map((payment, index) => (
            <Stack key={`${payment.method}-${payment.amount}-${index}`} spacing={0.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={700}>{paymentLabel(payment)}</Typography>
                <Typography fontWeight={800}>{formatMoney(payment.amount)}</Typography>
              </Stack>
              {payment.method === "CARD" ? (
                <Typography color="text.secondary" variant="body2">
                  {payment.card_plan_label || "Tarjeta"} · {payment.installments_months || 0} meses · comisión{" "}
                  {((Number(payment.commission_rate || 0) || 0) * 100).toFixed(2)}%
                </Typography>
              ) : null}
              <Divider />
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
