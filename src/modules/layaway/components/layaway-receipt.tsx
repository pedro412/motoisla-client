import React from "react";

import type { LayawayDetailResponse } from "@/lib/types/layaway";
import { usePrinterStore } from "@/store/printer-store";

interface LayawayReceiptProps {
  layaway: LayawayDetailResponse;
  type: "created" | "abono" | "liquidated";
}

function fmt(value: string | number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value));
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

function fmtDateOnly(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

function titleLine(type: LayawayReceiptProps["type"]) {
  if (type === "created") return "COMPROBANTE DE APARTADO";
  if (type === "abono") return "COMPROBANTE DE ABONO";
  return "APARTADO LIQUIDADO";
}

export const LayawayReceipt = React.forwardRef<HTMLDivElement, LayawayReceiptProps>(
  function LayawayReceipt({ layaway, type }, ref) {
    const { charWidth } = usePrinterStore();

    const HR = "=".repeat(charWidth);
    const LINE = "-".repeat(charWidth);
    const nameLen = Math.max(8, charWidth - 22);
    const cssWidth = charWidth <= 32 ? "52mm" : "72mm";
    const pageSize = charWidth <= 32 ? "58mm" : "80mm";

    const dateStr = fmtDate(layaway.updated_at ?? layaway.created_at);
    const venceStr = fmtDateOnly(layaway.expires_at);
    const title = titleLine(type);

    const rows: string[] = [
      HR,
      "MOTO ISLA".padStart(Math.floor((charWidth + 9) / 2)),
      title.padStart(Math.floor((charWidth + title.length) / 2)),
      HR,
      `Fecha:   ${dateStr}`,
      `Folio:   ${layaway.id.slice(0, 12)}`,
      LINE,
      `Cliente: ${layaway.customer_name}`,
      `Tel:     ${layaway.customer_phone}`,
      HR,
    ];

    if (type !== "abono") {
      rows.push(`${"ARTÍCULO".padEnd(nameLen)} CAN     P.U.    TOTAL`);
      rows.push(LINE);
      for (const line of layaway.lines) {
        const name = trunc(line.product_name ?? line.product_sku ?? "Producto", nameLen);
        const qty = String(Number(line.qty)).padStart(3);
        const pu = fmt(Number(line.unit_price));
        const lineTotal = Number(line.qty) * Number(line.unit_price) * (1 - Number(line.discount_pct) / 100);
        rows.push(`${name.padEnd(nameLen)} ${qty} ${pu.padStart(8)} ${fmt(lineTotal).padStart(8)}`);
      }
      rows.push(HR);
    }

    if (type === "created") {
      rows.push(`Total apartado:${fmt(layaway.total).padStart(charWidth - 15)}`);
      rows.push(`Depósito pagado:${fmt(layaway.deposit_amount).padStart(charWidth - 16)}`);
      rows.push(`Saldo pendiente:${fmt(layaway.balance_due).padStart(charWidth - 16)}`);
      rows.push(`Vence:${venceStr.padStart(charWidth - 6)}`);
      rows.push(HR);
      rows.push("Conserve este comprobante".padStart(Math.floor((charWidth + 25) / 2)));
    }

    if (type === "abono") {
      const lastPayment =
        layaway.payments.length > 0
          ? [...layaway.payments].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )[0]
          : null;

      if (lastPayment) {
        rows.push(`Abono registrado:${fmt(lastPayment.amount).padStart(charWidth - 17)}`);
        rows.push(`  ${methodLabel(lastPayment.method).padEnd(charWidth - 12)}${fmt(lastPayment.amount).padStart(10)}`);
      }
      rows.push(`Total apartado:${fmt(layaway.total).padStart(charWidth - 15)}`);
      rows.push(`Total pagado:${fmt(layaway.amount_paid).padStart(charWidth - 13)}`);
      rows.push(`Saldo pendiente:${fmt(layaway.balance_due).padStart(charWidth - 16)}`);
      rows.push(`Vence:${venceStr.padStart(charWidth - 6)}`);
      rows.push(HR);
      rows.push("Conserve este comprobante".padStart(Math.floor((charWidth + 25) / 2)));
    }

    if (type === "liquidated") {
      rows.push(`Total:${fmt(layaway.total).padStart(charWidth - 6)}`);
      rows.push(`PAGADO:${fmt(layaway.amount_paid).padStart(charWidth - 7)}`);
      rows.push(`Estado:${"LIQUIDADO".padStart(charWidth - 7)}`);
      rows.push(HR);
      rows.push("¡Gracias por su compra!".padStart(Math.floor((charWidth + 23) / 2)));
    }

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
