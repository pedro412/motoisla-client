"use client";

import { Alert, Box, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { reportsService } from "@/modules/reports/services/reports.service";

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value));
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-12-31");
  const [topLimit, setTopLimit] = useState(10);

  const params = useMemo(
    () => ({ date_from: dateFrom || undefined, date_to: dateTo || undefined, top_limit: topLimit }),
    [dateFrom, dateTo, topLimit],
  );

  const metricsQuery = useQuery({
    queryKey: ["metrics", params],
    queryFn: () => reportsService.getMetrics(params),
  });

  const reportQuery = useQuery({
    queryKey: ["sales-report", params],
    queryFn: () => reportsService.getSalesReport(params),
  });

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Admin Reports</Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        <TextField label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField label="Hasta" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField
          label="Top limit"
          type="number"
          value={topLimit}
          onChange={(e) => setTopLimit(Number(e.target.value || 10))}
        />
      </Stack>

      {metricsQuery.isError || reportQuery.isError ? (
        <Alert severity="error">No fue posible cargar reportes para el rango indicado.</Alert>
      ) : null}

      {metricsQuery.data ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2 }}>
              <Typography color="text.secondary">Ventas totales</Typography>
              <Typography variant="h5">{formatMoney(metricsQuery.data.total_sales)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2 }}>
              <Typography color="text.secondary">Ticket promedio</Typography>
              <Typography variant="h5">{formatMoney(metricsQuery.data.avg_ticket)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2 }}>
              <Typography color="text.secondary">Ventas</Typography>
              <Typography variant="h5">{metricsQuery.data.sales_count}</Typography>
            </Paper>
          </Grid>
        </Grid>
      ) : null}

      {reportQuery.data ? (
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Neto después de gastos
            </Typography>
            <Typography variant="h5">{formatMoney(reportQuery.data.net_sales_after_expenses)}</Typography>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Top productos
            </Typography>
            <Stack spacing={1}>
              {reportQuery.data.top_products.map((row) => (
                <Box key={row.product_id} sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography>{row.product__name}</Typography>
                  <Typography color="text.secondary">
                    {row.units_sold} uds · {formatMoney(row.sales_amount)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Ventas por día
            </Typography>
            <Stack spacing={1}>
              {reportQuery.data.sales_by_day.map((row) => (
                <Box key={row.confirmed_at__date} sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography>{row.confirmed_at__date}</Typography>
                  <Typography color="text.secondary">
                    {row.sales_count} ventas · {formatMoney(row.total_sales)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Stack>
      ) : null}
    </Stack>
  );
}
