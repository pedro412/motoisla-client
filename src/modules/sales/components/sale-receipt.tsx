import React from "react";

import type { SaleResponse } from "@/lib/types/sales";
import { usePrinterStore } from "@/store/printer-store";

interface SaleReceiptProps {
  sale: SaleResponse;
  changeDue: number;
}

function fmt(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

function fmtDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function trunc(str: string, len: number) {
  return str.length > len ? str.slice(0, len) : str;
}

function methodLabel(method: string) {
  if (method === "CASH") return "Efectivo";
  if (method === "CARD") return "Tarjeta";
  if (method === "CUSTOMER_CREDIT") return "Saldo favor";
  return method;
}

export const SaleReceipt = React.forwardRef<HTMLDivElement, SaleReceiptProps>(
  function SaleReceipt({ sale, changeDue }, ref) {
    const { charWidth } = usePrinterStore();

    const HR = "=".repeat(charWidth);
    const LINE = "-".repeat(charWidth);
    // Right-side fixed cols: " " + qty(3) + " " + price(8) + " " + total(8) = 22 chars
    const nameLen = Math.max(8, charWidth - 22);
    const cssWidth = charWidth <= 32 ? "52mm" : "72mm";
    const pageSize = charWidth <= 32 ? "58mm" : "80mm";

    const dateStr = fmtDate(sale.confirmed_at ?? sale.created_at);
    const subtotal = Number(sale.subtotal);
    const discount = Number(sale.discount_amount);
    const total = Number(sale.total);

    const rows: string[] = [
      HR,
      "MOTO ISLA".padStart(Math.floor((charWidth + 9) / 2)),
      HR,
      `Fecha:   ${dateStr}`,
      `Folio:   ${sale.id.slice(0, 12)}`,
      `Cajero:  ${sale.cashier_username}`,
    ];

    if (sale.customer_summary) {
      rows.push(LINE);
      rows.push(`Cliente: ${sale.customer_summary.name}`);
      rows.push(`Tel:     ${sale.customer_summary.phone}`);
    }

    rows.push(HR);
    rows.push(`${"ARTÍCULO".padEnd(nameLen)} CAN     P.U.    TOTAL`);
    rows.push(LINE);

    for (const line of sale.lines) {
      const name = trunc(line.product_name ?? line.product_sku ?? "Producto", nameLen);
      const qty = String(Number(line.qty)).padStart(3);
      const pu = fmt(Number(line.unit_price));
      const lineTotal = Number(line.qty) * Number(line.unit_price) * (1 - Number(line.discount_pct) / 100);
      rows.push(`${name.padEnd(nameLen)} ${qty} ${pu.padStart(8)} ${fmt(lineTotal).padStart(8)}`);
    }

    rows.push(LINE);
    rows.push(`Subtotal:${fmt(subtotal).padStart(charWidth - 9)}`);
    if (discount > 0) {
      rows.push(`Descuento:${fmt(discount).padStart(charWidth - 10)}`);
    }
    rows.push(`TOTAL:${fmt(total).padStart(charWidth - 6)}`);
    rows.push(HR);

    for (const p of sale.payments) {
      const label =
        p.method === "CARD" && p.card_plan_label
          ? `${methodLabel(p.method)} (${p.card_plan_label})`
          : methodLabel(p.method);
      rows.push(`${label.padEnd(charWidth - 10)}${fmt(Number(p.amount)).padStart(10)}`);
    }

    if (changeDue > 0) {
      rows.push(`Cambio:${fmt(changeDue).padStart(charWidth - 7)}`);
    }

    rows.push(HR);
    rows.push("¡Gracias por su visita!".padStart(Math.floor((charWidth + 23) / 2)));
    rows.push(HR);

    return (
      <div
        ref={ref}
        style={{
          width: cssWidth,
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "11px",
          color: "#000",
          padding: 0,
          margin: 0,
        }}
      >
        <style>{`@page { size: ${pageSize} auto; margin: 3mm; }`}</style>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "inherit" }}>
          {rows.join("\n")}
        </pre>
      </div>
    );
  },
);
