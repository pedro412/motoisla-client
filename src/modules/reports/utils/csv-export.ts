import type { SalesReportResponse } from "@/lib/types/reports";

function fmt(value: string | number) {
  return `$${Number(value).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function instrumentLabel(instrument: string | null) {
  if (instrument === "DEBIT") return "Tarjeta de débito";
  if (instrument === "CREDIT") return "Tarjeta de crédito";
  return instrument ?? "Sin tipo";
}

function methodLabel(method: string) {
  if (method === "CASH") return "Efectivo";
  if (method === "CARD") return "Tarjeta";
  if (method === "CUSTOMER_CREDIT") return "Saldo a favor";
  return method;
}

export function downloadMonthlyReportCsv(report: SalesReportResponse, monthLabel: string) {
  const BOM = "\uFEFF";
  const lines: string[] = [];

  lines.push("Reporte Mensual — MotoIsla");
  lines.push(`Periodo: ${monthLabel}`);
  lines.push("");

  lines.push("RESUMEN");
  lines.push(`Ventas totales,${fmt(report.total_sales)}`);
  lines.push(`Número de ventas,${report.sales_count}`);
  lines.push(`Utilidad bruta,${fmt(report.gross_profit_total)}`);
  lines.push(`Gastos operativos,${fmt(report.expenses_summary.total_expenses)}`);
  lines.push(`Utilidad neta tienda,${fmt(report.net_profit)}`);
  lines.push("");

  lines.push("MÉTODOS DE PAGO");
  lines.push("Método,Monto,Transacciones");
  for (const row of report.payment_breakdown.by_method) {
    lines.push(`${methodLabel(row.method)},${fmt(row.total_amount)},${row.transactions}`);
  }
  if (report.payment_breakdown.card_instruments?.length > 0) {
    for (const row of report.payment_breakdown.card_instruments) {
      lines.push(`${instrumentLabel(row.card_instrument)},${fmt(row.total_amount)},${row.transactions}`);
    }
  }
  lines.push("");

  lines.push("VENTAS POR DÍA");
  lines.push("Fecha,Ventas,Núm. ventas");
  for (const row of report.sales_by_day) {
    lines.push(`${row.confirmed_at__date},${fmt(row.total_sales)},${row.sales_count}`);
  }

  const csv = BOM + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `reporte-mensual-${monthLabel.replace(/\s+/g, "-").toLowerCase()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
