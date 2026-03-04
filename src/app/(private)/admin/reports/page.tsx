"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

import type { SalesReportResponse } from "@/lib/types/reports";
import { reportsService } from "@/modules/reports/services/reports.service";

type PeriodPreset = "current_month" | "previous_month" | "last_3_months" | "custom";

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(Number(value));
}

function formatNumber(value: string | number) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(Number(value));
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getPresetRange(preset: Exclude<PeriodPreset, "custom">) {
  const today = new Date();

  if (preset === "current_month") {
    return {
      dateFrom: toIsoDate(startOfMonth(today)),
      dateTo: toIsoDate(today),
      label: "Mes actual",
      description: "Desde el inicio del mes hasta hoy",
    };
  }

  if (preset === "previous_month") {
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return {
      dateFrom: toIsoDate(startOfMonth(previousMonth)),
      dateTo: toIsoDate(endOfMonth(previousMonth)),
      label: "Mes pasado",
      description: "Mes calendario anterior completo",
    };
  }

  const firstMonth = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  return {
    dateFrom: toIsoDate(startOfMonth(firstMonth)),
    dateTo: toIsoDate(today),
    label: "Últimos 3 meses",
    description: "Desde hace tres meses hasta hoy",
  };
}

function getPeriodMeta(preset: PeriodPreset, customDateFrom: string, customDateTo: string) {
  if (preset === "custom") {
    return {
      dateFrom: customDateFrom || undefined,
      dateTo: customDateTo || undefined,
      label: "Rango personalizado",
      description:
        customDateFrom && customDateTo ? `${customDateFrom} a ${customDateTo}` : "Selecciona un rango manual",
    };
  }

  return getPresetRange(preset);
}

function toneStyles(tone: "emerald" | "sky" | "amber" | "slate" | "teal" | "rose") {
  const palette = {
    emerald: {
      border: "rgba(16, 185, 129, 0.32)",
      glow: "rgba(16, 185, 129, 0.18)",
      text: "#a7f3d0",
      accent: "#10b981",
    },
    sky: {
      border: "rgba(56, 189, 248, 0.32)",
      glow: "rgba(56, 189, 248, 0.18)",
      text: "#bae6fd",
      accent: "#38bdf8",
    },
    amber: {
      border: "rgba(251, 191, 36, 0.32)",
      glow: "rgba(251, 191, 36, 0.16)",
      text: "#fde68a",
      accent: "#f59e0b",
    },
    slate: {
      border: "rgba(148, 163, 184, 0.26)",
      glow: "rgba(71, 85, 105, 0.22)",
      text: "#cbd5e1",
      accent: "#94a3b8",
    },
    teal: {
      border: "rgba(45, 212, 191, 0.28)",
      glow: "rgba(45, 212, 191, 0.18)",
      text: "#99f6e4",
      accent: "#14b8a6",
    },
    rose: {
      border: "rgba(251, 113, 133, 0.28)",
      glow: "rgba(251, 113, 133, 0.16)",
      text: "#fecdd3",
      accent: "#fb7185",
    },
  } as const;

  return palette[tone];
}

function KpiCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: "emerald" | "sky" | "amber" | "slate" | "teal" | "rose";
}) {
  const style = toneStyles(tone);

  return (
    <Paper
      sx={{
        p: 2.25,
        height: "100%",
        border: `1px solid ${style.border}`,
        background: `linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, ${style.glow} 100%)`,
        boxShadow: "0 18px 48px rgba(2, 6, 23, 0.22)",
      }}
    >
      <Stack spacing={1.25}>
        <Typography
          variant="overline"
          sx={{ color: style.text, fontWeight: 800, letterSpacing: "0.08em" }}
        >
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
          {subtitle}
        </Typography>
      </Stack>
    </Paper>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Paper
      sx={{
        p: 2.5,
        height: "100%",
        border: "1px solid rgba(148, 163, 184, 0.14)",
        background:
          "linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(15, 23, 42, 0.96) 100%)",
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
            {subtitle}
          </Typography>
        </Box>
        {children}
      </Stack>
    </Paper>
  );
}

function MetricSkeleton() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Grid key={index} size={{ xs: 12, md: 6, xl: 4 }}>
          <Paper sx={{ p: 2.25 }}>
            <Skeleton height={22} width="45%" />
            <Skeleton height={44} width="65%" />
            <Skeleton height={20} width="80%" />
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

function EmptyRows({ label }: { label: string }) {
  return (
    <Box
      sx={{
        border: "1px dashed rgba(148, 163, 184, 0.2)",
        borderRadius: 2,
        p: 2,
        textAlign: "center",
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  );
}

function HorizontalRows<T extends object>({
  rows,
  getValue,
  primaryLabel,
  secondaryLabel,
  barColor,
  formatValue,
}: {
  rows: T[];
  getValue: (row: T) => number;
  primaryLabel: (row: T) => string;
  secondaryLabel: (row: T) => string;
  barColor: string;
  formatValue: (value: number) => string;
}) {
  const maxValue = rows.reduce((largest, row) => Math.max(largest, getValue(row)), 0);

  if (rows.length === 0) {
    return <EmptyRows label="Sin movimientos para el rango seleccionado." />;
  }

  return (
    <Stack spacing={1.25}>
      {rows.map((row, index) => {
        const rawValue = getValue(row);
        const width = maxValue > 0 ? `${Math.max((rawValue / maxValue) * 100, 8)}%` : "8%";

        return (
          <Box key={`${primaryLabel(row)}-${index}`}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mb: 0.65 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {primaryLabel(row)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  {secondaryLabel(row)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                {formatValue(rawValue)}
              </Typography>
            </Box>
            <Box
              sx={{
                width: "100%",
                height: 8,
                borderRadius: 999,
                overflow: "hidden",
                backgroundColor: "rgba(148, 163, 184, 0.12)",
              }}
            >
              <Box
                sx={{
                  width,
                  height: "100%",
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${barColor} 0%, rgba(255,255,255,0.12) 100%)`,
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function PaymentBreakdown({ report }: { report: SalesReportResponse }) {
  if (report.payment_breakdown.by_method.length === 0) {
    return <EmptyRows label="Sin pagos confirmados para este rango." />;
  }

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {report.payment_breakdown.by_method.map((row) => (
          <Chip
            key={row.method}
            label={`${row.method}: ${formatMoney(row.total_amount)}`}
            sx={{
              fontWeight: 700,
              borderRadius: 1.5,
              backgroundColor: "rgba(56, 189, 248, 0.14)",
              color: "#bae6fd",
              border: "1px solid rgba(56, 189, 248, 0.22)",
            }}
          />
        ))}
      </Stack>

      {report.payment_breakdown.card_types.length > 0 ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {report.payment_breakdown.card_types.map((row) => (
            <Chip
              key={row.card_type ?? "UNKNOWN"}
              label={`${row.card_type ?? "Sin tipo"}: ${formatMoney(row.total_amount)}`}
              size="small"
              sx={{
                fontWeight: 700,
                borderRadius: 1.5,
                backgroundColor: "rgba(45, 212, 191, 0.12)",
                color: "#99f6e4",
                border: "1px solid rgba(45, 212, 191, 0.18)",
              }}
            />
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

export default function ReportsPage() {
  const today = new Date();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("current_month");
  const [customDateFrom, setCustomDateFrom] = useState(toIsoDate(startOfMonth(today)));
  const [customDateTo, setCustomDateTo] = useState(toIsoDate(today));

  const period = getPeriodMeta(periodPreset, customDateFrom, customDateTo);
  const params = {
    date_from: period.dateFrom,
    date_to: period.dateTo,
    top_limit: 6,
  };

  const reportQuery = useQuery({
    queryKey: ["sales-report", params],
    queryFn: () => reportsService.getSalesReport(params),
  });

  const report = reportQuery.data;

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 2.25, md: 3 },
          border: "1px solid rgba(56, 189, 248, 0.14)",
          background:
            "radial-gradient(circle at top right, rgba(56, 189, 248, 0.16), transparent 35%), radial-gradient(circle at top left, rgba(16, 185, 129, 0.14), transparent 28%), linear-gradient(135deg, rgba(2, 6, 23, 0.98) 0%, rgba(15, 23, 42, 0.96) 100%)",
          boxShadow: "0 24px 64px rgba(2, 6, 23, 0.28)",
        }}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", lg: "center" }}
          >
            <Box>
              <Typography variant="overline" sx={{ color: "#bae6fd", fontWeight: 800, letterSpacing: "0.08em" }}>
                Consola financiera
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Reportes
              </Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 500, mt: 0.5 }}>
                Visión operativa de ventas, compras, gastos e inventario en un solo tablero.
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Chip
                label={period.label}
                sx={{
                  fontWeight: 800,
                  borderRadius: 1.5,
                  backgroundColor: "rgba(16, 185, 129, 0.14)",
                  color: "#a7f3d0",
                  border: "1px solid rgba(16, 185, 129, 0.22)",
                }}
              />
              <Chip
                label={period.description}
                sx={{
                  fontWeight: 700,
                  borderRadius: 1.5,
                  backgroundColor: "rgba(148, 163, 184, 0.12)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                }}
              />
            </Stack>
          </Stack>

          <Stack spacing={1.5}>
            <ToggleButtonGroup
              value={periodPreset}
              exclusive
              onChange={(_, nextValue: PeriodPreset | null) => {
                if (nextValue) {
                  setPeriodPreset(nextValue);
                }
              }}
              sx={{
                flexWrap: "wrap",
                gap: 1,
                "& .MuiToggleButtonGroup-grouped": {
                  borderRadius: "12px !important",
                  border: "1px solid rgba(148, 163, 184, 0.16) !important",
                },
              }}
            >
              <ToggleButton value="current_month" sx={{ px: 2, fontWeight: 700 }}>
                Mes actual
              </ToggleButton>
              <ToggleButton value="previous_month" sx={{ px: 2, fontWeight: 700 }}>
                Mes pasado
              </ToggleButton>
              <ToggleButton value="last_3_months" sx={{ px: 2, fontWeight: 700 }}>
                Últimos 3 meses
              </ToggleButton>
              <ToggleButton value="custom" sx={{ px: 2, fontWeight: 700 }}>
                Personalizado
              </ToggleButton>
            </ToggleButtonGroup>

            {periodPreset === "custom" ? (
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                <TextField
                  label="Desde"
                  type="date"
                  value={customDateFrom}
                  onChange={(event) => setCustomDateFrom(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: { md: 180 } }}
                />
                <TextField
                  label="Hasta"
                  type="date"
                  value={customDateTo}
                  onChange={(event) => setCustomDateTo(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: { md: 180 } }}
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    setCustomDateFrom(toIsoDate(startOfMonth(new Date())));
                    setCustomDateTo(toIsoDate(new Date()));
                  }}
                  sx={{ alignSelf: { xs: "stretch", md: "center" }, fontWeight: 700 }}
                >
                  Resetear a mes actual
                </Button>
              </Stack>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      {reportQuery.isError ? (
        <Alert severity="error">No fue posible cargar los reportes para el rango indicado.</Alert>
      ) : null}

      {reportQuery.isLoading ? <MetricSkeleton /> : null}

      {report ? (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <KpiCard
                title="Utilidad bruta"
                value={formatMoney(report.gross_profit_total)}
                subtitle={`Utilidad total antes de repartir a inversionistas`}
                tone="teal"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <KpiCard
                title="Participación inversionistas"
                value={formatMoney(report.investor_metrics.investor_profit_share_total)}
                subtitle={`Utilidad transferida por ventas respaldadas`}
                tone="amber"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <KpiCard
                title="Utilidad neta tienda"
                value={formatMoney(report.net_profit)}
                subtitle={`Utilidad tienda ${formatMoney(report.investor_metrics.store_profit_share_total)} menos gastos ${formatMoney(report.expenses_summary.total_expenses)}`}
                tone={Number(report.net_profit) >= 0 ? "emerald" : "rose"}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <KpiCard
                title="Ventas del periodo"
                value={formatMoney(report.total_sales)}
                subtitle={`${report.sales_count} ventas confirmadas · ticket promedio ${formatMoney(report.avg_ticket)}`}
                tone="sky"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <KpiCard
                title="Compras del periodo"
                value={formatMoney(report.purchase_spend)}
                subtitle={`${report.purchase_count} recepciones posteadas en el rango`}
                tone="amber"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <KpiCard
                title="Gastos operativos"
                value={formatMoney(report.expenses_summary.total_expenses)}
                subtitle={`${report.expenses_summary.expenses_count} gastos registrados`}
                tone="rose"
              />
            </Grid>
            {report.profitability_metrics ? (
              <Grid size={{ xs: 12, md: 6, xl: 3 }}>
                <KpiCard
                  title="Costo operativo asignado"
                  value={formatMoney(report.profitability_metrics.operating_cost_total_allocated)}
                  subtitle={`Tasa promedio ${(Number(report.profitability_metrics.operating_cost_rate_avg) * 100).toFixed(2)}%`}
                  tone="teal"
                />
              </Grid>
            ) : null}
            {report.profitability_metrics ? (
              <Grid size={{ xs: 12, md: 6, xl: 3 }}>
                <KpiCard
                  title="Fallback de tasa"
                  value={formatNumber(report.profitability_metrics.fallback_usage_count)}
                  subtitle="Ventas que usaron tasa base por baja muestra"
                  tone="slate"
                />
              </Grid>
            ) : null}
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <KpiCard
                title="Inventario propio"
                value={formatMoney(report.inventory_snapshot.store_owned_cost_value)}
                subtitle={`${formatNumber(report.inventory_snapshot.store_owned_units)} unidades propias a costo`}
                tone="slate"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6, xl: 3 }}>
              <KpiCard
                title="Inventario inversionistas"
                value={formatMoney(report.inventory_snapshot.investor_assigned_cost_value)}
                subtitle={`${formatNumber(report.inventory_snapshot.investor_assigned_units)} unidades financiadas`}
                tone="sky"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <SectionCard
                title="Exposición económica"
                subtitle="Separación entre lo que sigue siendo capital de la tienda y lo que ya quedó respaldado por inversionistas"
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <KpiCard
                      title="Ventas respaldadas"
                      value={formatMoney(report.investor_metrics.investor_backed_sales_total)}
                      subtitle="Ingresos originados en inventario asignado"
                      tone="amber"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <KpiCard
                      title="Ventas propias"
                      value={formatMoney(report.investor_metrics.store_owned_sales_total)}
                      subtitle="Ingresos de inventario aún propio"
                      tone="emerald"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <KpiCard
                      title="Costo reclasificado"
                      value={formatMoney(report.investor_metrics.inventory_cost_assigned_to_investors)}
                      subtitle={`Exposición neta tienda ${formatMoney(report.investor_metrics.store_net_inventory_exposure_change)}`}
                      tone="slate"
                    />
                  </Grid>
                </Grid>
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, xl: 7 }}>
              <SectionCard
                title="Ritmo de ventas"
                subtitle="Distribución por día para detectar picos y semanas flojas"
              >
                <HorizontalRows
                  rows={report.sales_by_day}
                  getValue={(row) => Number(row.total_sales)}
                  primaryLabel={(row) => String(row.confirmed_at__date)}
                  secondaryLabel={(row) => `${row.sales_count} ventas`}
                  barColor="#38bdf8"
                  formatValue={(value) => formatMoney(value)}
                />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, xl: 5 }}>
              <SectionCard
                title="Gastos por categoría"
                subtitle="Visibilidad rápida del gasto operativo y dónde se concentra"
              >
                <HorizontalRows
                  rows={report.expenses_summary.by_category}
                  getValue={(row) => Number(row.total_amount)}
                  primaryLabel={(row) => String(row.category)}
                  secondaryLabel={(row) => `${row.items_count} registros`}
                  barColor="#fb7185"
                  formatValue={(value) => formatMoney(value)}
                />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, xl: 7 }}>
              <SectionCard
                title="Top productos"
                subtitle="Los productos que más vendieron dentro del rango seleccionado"
              >
                <HorizontalRows
                  rows={report.top_products}
                  getValue={(row) => Number(row.sales_amount)}
                  primaryLabel={(row) => String(row.product__name)}
                  secondaryLabel={(row) => `${row.product__sku} · ${row.units_sold} uds`}
                  barColor="#14b8a6"
                  formatValue={(value) => formatMoney(value)}
                />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, xl: 5 }}>
              <SectionCard
                title="Ingresos por cajero"
                subtitle="Comparativo operativo para revisar desempeño del equipo"
              >
                <HorizontalRows
                  rows={report.sales_by_cashier}
                  getValue={(row) => Number(row.total_sales)}
                  primaryLabel={(row) => String(row.cashier__username)}
                  secondaryLabel={(row) => `${row.sales_count} ventas · ticket ${formatMoney(String(row.avg_ticket))}`}
                  barColor="#10b981"
                  formatValue={(value) => formatMoney(value)}
                />
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <SectionCard
                title="Métodos de pago"
                subtitle="Mezcla de cobranza del periodo para decisiones de caja y comisiones"
              >
                <PaymentBreakdown report={report} />
              </SectionCard>
            </Grid>
          </Grid>
        </>
      ) : null}
    </Stack>
  );
}
