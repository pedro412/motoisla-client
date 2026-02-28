import type { MatchStatus } from "@/lib/types/purchases";
import type { ProductListItem } from "@/lib/types/products";

const IVA_RATE = 0.16;
const PUBLIC_MARKUP = 1.3;

export interface ParsedPreviewLine {
  sku: string;
  name: string;
  qty: string | null;
  unit_cost: string | null;
  unit_price: string | null;
  public_price: string | null;
  brand_name: string;
  product_type_name: string;
  is_selected: boolean;
  notes: string;
  raw_line: string;
  match_status: MatchStatus;
  matched_product?: string | null;
}

interface PendingLine {
  sku: string;
  qty: number | null;
  name: string;
  rawLine: string;
}

export function applyKnownProductMatches(
  lines: ParsedPreviewLine[],
  products: Array<Pick<ProductListItem, "id" | "sku" | "brand_name" | "product_type_name">>,
): ParsedPreviewLine[] {
  const bySku = new Map(products.map((product) => [product.sku.trim().toUpperCase(), product]));

  return lines.map((line) => {
    if (line.match_status === "INVALID") {
      return line;
    }

    const matchedProduct = bySku.get(line.sku.trim().toUpperCase());
    if (!matchedProduct) {
      return {
        ...line,
        matched_product: null,
        match_status: line.sku ? "NEW_PRODUCT" : "INVALID",
      };
    }

    const nextBrandName = line.brand_name || matchedProduct.brand_name || "";
    const nextProductTypeName = line.product_type_name || matchedProduct.product_type_name || "";
    const canClearTaxonomyNote =
      line.notes === "Completa marca/tipo antes de confirmar." && nextBrandName.trim() && nextProductTypeName.trim();

    return {
      ...line,
      matched_product: matchedProduct.id,
      match_status: "MATCHED_PRODUCT",
      brand_name: nextBrandName,
      product_type_name: nextProductTypeName,
      notes: canClearTaxonomyNote ? "" : line.notes,
    };
  });
}

interface ParseMyesaInvoiceOptions {
  knownBrands?: string[];
}

const ITEM_HEADER_REGEX = /^\*+\s+([A-Z0-9-]+)\s+(\d+(?:\.\d+)?)\s+\S+\s+(.+)$/i;
const AMOUNTS_REGEX = /^\s*([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)\s*$/;

const IGNORE_LINE_PATTERNS = [/^NO\.COM\s+/i, /CFDI/i, /CLAVE\s+PRODUCTO/i, /CLAVE\s+PEDIMENTO/i];

function shouldIgnoreLine(line: string) {
  return IGNORE_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function parseNumeric(input: string): number {
  const parsed = Number(input.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMoney(value: number): string {
  return value.toFixed(2);
}

function buildInvalidLine(pending: PendingLine): ParsedPreviewLine {
  return {
    sku: pending.sku,
    name: pending.name,
    qty: pending.qty !== null ? pending.qty.toFixed(2) : null,
    unit_cost: null,
    unit_price: null,
    public_price: null,
    brand_name: "",
    product_type_name: "",
    is_selected: false,
    notes: "Linea sin importes detectados. Revisar captura.",
    raw_line: pending.rawLine,
    match_status: "INVALID",
  };
}

function inferBrand(name: string, knownBrands: string[] = []): string {
  const upper = name.toUpperCase();
  const normalizedBrands = [...knownBrands]
    .map((brand) => brand.trim().toUpperCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const brand of normalizedBrands) {
    if (upper.includes(brand)) {
      return brand;
    }
  }

  if (upper.includes("LS2")) {
    return "LS2";
  }
  if (upper.includes("PROMOTO")) {
    return "PROMOTO";
  }
  return "";
}

function inferProductType(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes("GUANTES")) {
    return "GUANTES";
  }
  if (upper.includes("CANDADO")) {
    return "CANDADOS";
  }
  if (upper.includes("CHAMARRA")) {
    return "CHAMARRAS";
  }
  if (upper.includes("CASCO ABATIBLE") || upper.includes("CASCO")) {
    return "CASCOS ABATIBLES";
  }
  return "";
}

export function parseMyesaInvoice(rawText: string, options: ParseMyesaInvoiceOptions = {}): ParsedPreviewLine[] {
  const lines = rawText.split(/\r?\n/);
  const parsed: ParsedPreviewLine[] = [];
  let pending: PendingLine | null = null;
  const knownBrands = options.knownBrands ?? [];

  for (const source of lines) {
    const line = source.trim();
    if (!line || shouldIgnoreLine(line)) {
      continue;
    }

    const header = line.match(ITEM_HEADER_REGEX);
    if (header) {
      if (pending) {
        parsed.push(buildInvalidLine(pending));
      }

      pending = {
        sku: header[1].toUpperCase(),
        qty: parseNumeric(header[2]),
        name: header[3].trim(),
        rawLine: line,
      };
      continue;
    }

    const amounts = line.match(AMOUNTS_REGEX);
    if (amounts && pending) {
      const unitCost = parseNumeric(amounts[1]);
      const unitPrice = unitCost * (1 + IVA_RATE);
      const publicPrice = unitPrice * PUBLIC_MARKUP;
      const brandName = inferBrand(pending.name, knownBrands);
      const productTypeName = inferProductType(pending.name);

      parsed.push({
        sku: pending.sku,
        name: pending.name,
        qty: pending.qty !== null ? pending.qty.toFixed(2) : null,
        unit_cost: toMoney(unitCost),
        unit_price: toMoney(unitPrice),
        public_price: toMoney(publicPrice),
        brand_name: brandName,
        product_type_name: productTypeName,
        is_selected: true,
        notes: brandName && productTypeName ? "" : "Completa marca/tipo antes de confirmar.",
        raw_line: `${pending.rawLine} | ${line}`,
        match_status: pending.sku ? "NEW_PRODUCT" : "INVALID",
      });
      pending = null;
    }
  }

  if (pending) {
    parsed.push(buildInvalidLine(pending));
  }

  return parsed;
}
