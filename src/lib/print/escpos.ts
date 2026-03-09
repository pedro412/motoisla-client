/**
 * ESC/POS ticket builder.
 * Generates raw byte arrays for Epson ESC/POS compatible thermal printers
 * (POS80, Bixolon, Star Micronics, generic 80mm/58mm USB thermal printers).
 *
 * Diacritics are stripped (á→a, é→e, ñ→n, etc.) for safe ASCII transmission.
 * For proper Unicode support, configure the printer's code page via ESC t.
 */

import type { LayawayDetailResponse } from "@/lib/types/layaway";
import type { SaleResponse } from "@/lib/types/sales";

// ─── ESC/POS command constants ─────────────────────────────────────────────────

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const C = {
  INIT:     Uint8Array.from([ESC, 0x40]),             // Initialize printer (reset)
  ALIGN_L:  Uint8Array.from([ESC, 0x61, 0x00]),       // Left align
  ALIGN_C:  Uint8Array.from([ESC, 0x61, 0x01]),       // Center align
  BOLD_ON:  Uint8Array.from([ESC, 0x45, 0x01]),       // Bold on
  BOLD_OFF: Uint8Array.from([ESC, 0x45, 0x00]),       // Bold off
  DBL_ON:   Uint8Array.from([GS,  0x21, 0x11]),       // Double width + height
  DBL_OFF:  Uint8Array.from([GS,  0x21, 0x00]),       // Normal size
  // GS V 66 n  → feed n lines + partial cut
  // We use n=3 here; extra LF are added before this command for safe margin.
  CUT:      Uint8Array.from([GS,  0x56, 0x42, 0x03]), // Feed 3 lines + partial cut
} as const;

// Extra blank lines added before the cut so the last text isn't too close.
const FEED_BEFORE_CUT = Uint8Array.from([LF, LF, LF, LF]);

// ─── Config ────────────────────────────────────────────────────────────────────

export interface TicketConfig {
  charWidth: number;
  storeAddress?: string;
  storePhone?: string;
  /** Explicit abono amount — used for type="abono" tickets to avoid relying on payment sort order. */
  abonoAmount?: number;
  /** Explicit abono method — used for type="abono" tickets. */
  abonoMethod?: string;
}

// ─── Low-level helpers ──────────────────────────────────────────────────────────

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(len);
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}

/** Strip diacritics and non-printable-ASCII for thermal printer compatibility. */
function sanitize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // Remove combining diacritics (é→e, á→a)
    .replace(/[ñ]/g, "n").replace(/[Ñ]/g, "N")
    .replace(/[¡]/g, "!").replace(/[¿]/g, "?")
    .replace(/[€]/g, "EUR")
    .replace(/[^\x20-\x7e]/g, "?");   // Replace remaining non-ASCII with ?
}

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(sanitize(s));
}

function row(s: string): Uint8Array {
  return concat(enc(s), Uint8Array.from([LF]));
}

function hr(w: number, ch = "="): Uint8Array {
  return row(ch.repeat(w));
}

/** Center a string within `width` columns (truncates if too long). */
function centerStr(s: string, width: number): string {
  const safe = sanitize(s);
  const text = safe.length > width ? safe.slice(0, width) : safe;
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text;
}

// ─── Formatting helpers ─────────────────────────────────────────────────────────

function money(v: number): string {
  const [int, dec] = v.toFixed(2).split(".");
  return "$" + int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + dec;
}

function trunc(s: string, len: number): string {
  return s.length > len ? s.slice(0, len) : s;
}

function methodLabel(m: string): string {
  if (m === "CASH") return "Efectivo";
  if (m === "CARD") return "Tarjeta";
  if (m === "CUSTOMER_CREDIT") return "Saldo favor";
  return m;
}

function fmtDate(s: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(s));
}

function fmtDateOnly(s: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(s));
}

// ─── Shared footer builder ─────────────────────────────────────────────────────

/** Produces the closing section: thank-you, optional store info, extra feed, cut. */
function buildFooter(thankYou: string, config: TicketConfig): Uint8Array {
  const { charWidth, storeAddress, storePhone } = config;
  const hasInfo = (storeAddress?.trim() ?? "") !== "" || (storePhone?.trim() ?? "") !== "";

  const parts: Uint8Array[] = [
    hr(charWidth),
    C.ALIGN_C,
    row(thankYou),
  ];

  if (hasInfo) {
    parts.push(hr(charWidth, "-"));
    if (storeAddress?.trim()) {
      parts.push(row(centerStr(storeAddress.trim(), charWidth)));
    }
    if (storePhone?.trim()) {
      parts.push(row(centerStr(`Tel: ${storePhone.trim()}`, charWidth)));
    }
  }

  parts.push(hr(charWidth));
  parts.push(C.ALIGN_L);
  parts.push(FEED_BEFORE_CUT);
  parts.push(C.CUT);

  return concat(...parts);
}

// ─── Ticket builders ────────────────────────────────────────────────────────────

export function buildSaleTicketBytes(
  sale: SaleResponse,
  changeDue: number,
  config: TicketConfig,
): Uint8Array {
  const { charWidth } = config;
  const nameLen = Math.max(8, charWidth - 22);
  const date = fmtDate(sale.confirmed_at ?? sale.created_at);
  const subtotal = Number(sale.subtotal);
  const discount = Number(sale.discount_amount);
  const total = Number(sale.total);

  const parts: Uint8Array[] = [
    C.INIT,
    // Header
    C.ALIGN_C, C.BOLD_ON, C.DBL_ON,
    row("MOTO ISLA"),
    C.DBL_OFF, C.BOLD_OFF,
    row("TICKET DE VENTA"),
    C.ALIGN_L,
    hr(charWidth),
    row(`Fecha:   ${date}`),
    row(`Folio:   ${sale.id.slice(0, 12)}`),
    row(`Cajero:  ${sale.cashier_username}`),
  ];

  if (sale.customer_summary) {
    parts.push(hr(charWidth, "-"));
    parts.push(row(`Cliente: ${sale.customer_summary.name}`));
    parts.push(row(`Tel:     ${sale.customer_summary.phone}`));
  }

  // Products table
  parts.push(hr(charWidth));
  parts.push(row(`${"ARTICULO".padEnd(nameLen)} CAN    P.U.   TOTAL`));
  parts.push(hr(charWidth, "-"));

  for (const line of sale.lines) {
    const name = trunc(line.product_name ?? line.product_sku ?? "Producto", nameLen);
    const qty = String(Number(line.qty)).padStart(3);
    const pu = money(Number(line.unit_price));
    const lt = Number(line.qty) * Number(line.unit_price) * (1 - Number(line.discount_pct) / 100);
    parts.push(row(`${name.padEnd(nameLen)} ${qty} ${pu.padStart(8)} ${money(lt).padStart(8)}`));
  }

  // Totals
  parts.push(hr(charWidth, "-"));
  parts.push(row(`Subtotal:${money(subtotal).padStart(charWidth - 9)}`));
  if (discount > 0) {
    parts.push(row(`Descuento:${money(discount).padStart(charWidth - 10)}`));
  }
  parts.push(C.BOLD_ON);
  parts.push(row(`TOTAL:${money(total).padStart(charWidth - 6)}`));
  parts.push(C.BOLD_OFF);
  parts.push(hr(charWidth));

  // Payments
  for (const p of sale.payments) {
    const label =
      p.method === "CARD" && p.card_plan_label
        ? `${methodLabel(p.method)} (${p.card_plan_label})`
        : methodLabel(p.method);
    parts.push(row(`${label.padEnd(charWidth - 10)}${money(Number(p.amount)).padStart(10)}`));
  }

  if (changeDue > 0) {
    parts.push(row(`Cambio:${money(changeDue).padStart(charWidth - 7)}`));
  }

  parts.push(buildFooter("!Gracias por su visita!", config));

  return concat(...parts);
}

export type LayawayTicketType = "created" | "abono" | "liquidated";

export function buildLayawayTicketBytes(
  layaway: LayawayDetailResponse,
  type: LayawayTicketType,
  config: TicketConfig,
): Uint8Array {
  const { charWidth } = config;
  const nameLen = Math.max(8, charWidth - 22);
  const date = fmtDate(layaway.updated_at ?? layaway.created_at);
  const vence = fmtDateOnly(layaway.expires_at);

  const titleMap: Record<LayawayTicketType, string> = {
    created:    "COMPROBANTE DE APARTADO",
    abono:      "COMPROBANTE DE ABONO",
    liquidated: "APARTADO LIQUIDADO",
  };

  const parts: Uint8Array[] = [
    C.INIT,
    C.ALIGN_C, C.BOLD_ON, C.DBL_ON,
    row("MOTO ISLA"),
    C.DBL_OFF, C.BOLD_OFF,
    row(titleMap[type]),
    C.ALIGN_L,
    hr(charWidth),
    row(`Fecha:   ${date}`),
    row(`Folio:   ${layaway.id.slice(0, 12)}`),
    hr(charWidth, "-"),
    row(`Cliente: ${layaway.customer_name}`),
    row(`Tel:     ${layaway.customer_phone}`),
    hr(charWidth),
  ];

  // Products table (not for "abono")
  if (type !== "abono") {
    parts.push(row(`${"ARTICULO".padEnd(nameLen)} CAN    P.U.   TOTAL`));
    parts.push(hr(charWidth, "-"));
    for (const line of layaway.lines) {
      const name = trunc(line.product_name ?? line.product_sku ?? "Producto", nameLen);
      const qty = String(Number(line.qty)).padStart(3);
      const pu = money(Number(line.unit_price));
      const lt = Number(line.qty) * Number(line.unit_price) * (1 - Number(line.discount_pct) / 100);
      parts.push(row(`${name.padEnd(nameLen)} ${qty} ${pu.padStart(8)} ${money(lt).padStart(8)}`));
    }
    parts.push(hr(charWidth));
  }

  if (type === "created") {
    parts.push(row(`Total apartado:${money(Number(layaway.total)).padStart(charWidth - 15)}`));
    parts.push(row(`Deposito pagado:${money(Number(layaway.deposit_amount)).padStart(charWidth - 16)}`));
    parts.push(row(`Saldo pendiente:${money(Number(layaway.balance_due)).padStart(charWidth - 16)}`));
    parts.push(row(`Vence:${vence.padStart(charWidth - 6)}`));
    parts.push(buildFooter("Conserve este comprobante", config));
  }

  if (type === "abono") {
    const amt = config.abonoAmount ?? 0;
    const meth = config.abonoMethod ?? "";

    parts.push(C.BOLD_ON);
    parts.push(row(`Abono registrado:${money(amt).padStart(charWidth - 17)}`));
    parts.push(C.BOLD_OFF);
    parts.push(row(`  ${methodLabel(meth).padEnd(charWidth - 12)}${money(amt).padStart(10)}`));
    parts.push(hr(charWidth, "-"));
    parts.push(row(`Total apartado:${money(Number(layaway.total)).padStart(charWidth - 15)}`));
    parts.push(row(`Total pagado:${money(Number(layaway.amount_paid)).padStart(charWidth - 13)}`));
    parts.push(C.BOLD_ON);
    parts.push(row(`Saldo pendiente:${money(Number(layaway.balance_due)).padStart(charWidth - 16)}`));
    parts.push(C.BOLD_OFF);
    parts.push(row(`Vence:${vence.padStart(charWidth - 6)}`));
    parts.push(buildFooter("Conserve este comprobante", config));
  }

  if (type === "liquidated") {
    parts.push(row(`Total:${money(Number(layaway.total)).padStart(charWidth - 6)}`));
    parts.push(C.BOLD_ON);
    parts.push(row(`PAGADO:${money(Number(layaway.amount_paid)).padStart(charWidth - 7)}`));
    parts.push(C.BOLD_OFF);
    parts.push(row(`Estado:${"LIQUIDADO".padStart(charWidth - 7)}`));
    parts.push(buildFooter("!Gracias por su compra!", config));
  }

  return concat(...parts);
}

export function buildTestTicketBytes(config: TicketConfig): Uint8Array {
  const { charWidth } = config;
  const nameLen = Math.max(8, charWidth - 22);
  const now = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date());

  return concat(
    C.INIT,
    C.ALIGN_C, C.BOLD_ON, C.DBL_ON, row("MOTO ISLA"), C.DBL_OFF, C.BOLD_OFF,
    row("TICKET DE PRUEBA"),
    C.ALIGN_L,
    hr(charWidth),
    row(`Fecha:   ${now}`),
    row(`Ancho:   ${charWidth} columnas`),
    row(`Papel:   ${charWidth <= 32 ? "58 mm" : "80 mm"}`),
    hr(charWidth, "-"),
    row(`${"ARTICULO".padEnd(nameLen)} CAN    P.U.   TOTAL`),
    hr(charWidth, "-"),
    row(`${"Aceite Motor 10W".padEnd(nameLen)}   1  $150.00  $150.00`),
    row(`${"Filtro Aire".padEnd(nameLen)}   2   $80.00  $160.00`),
    hr(charWidth, "-"),
    C.BOLD_ON, row(`TOTAL:${money(310).padStart(charWidth - 6)}`), C.BOLD_OFF,
    hr(charWidth),
    row(`Efectivo${money(400).padStart(charWidth - 8)}`),
    row(`Cambio:${money(90).padStart(charWidth - 7)}`),
    buildFooter("!Impresora lista!", config),
  );
}
