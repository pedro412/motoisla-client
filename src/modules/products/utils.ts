import type { ProductCreatePayload, ProductDetail, ProductListItem, ProductUpdatePayload } from "@/lib/types/products";

export interface ProductFormState {
  sku: string;
  name: string;
  stock: string;
  default_price: string;
  brand: string | null;
  brand_name: string;
  product_type: string | null;
  product_type_name: string;
  extraPrices: Record<string, string>;
}

export interface ProductFormErrors {
  sku?: string;
  name?: string;
  stock?: string;
  default_price?: string;
  brand?: string;
  product_type?: string;
  extraPrices?: Record<string, string>;
}

export interface ProfitMetrics {
  salePrice: number | null;
  baseCostPrice: number | null;
  costPriceWithTax: number | null;
  profitAmount: number | null;
  profitPercentage: number | null;
}

const IVA_RATE = 0.16;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function addTaxToAmount(value: string | number | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return roundMoney(parsed * (1 + IVA_RATE)).toFixed(2);
}

export function removeTaxFromAmount(value: string | number | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return roundMoney(parsed / (1 + IVA_RATE)).toFixed(2);
}

export function sortProductsForDisplay(products: ProductListItem[]) {
  return [...products].sort((left, right) => {
    const leftHasStock = Number(left.stock) > 0 ? 1 : 0;
    const rightHasStock = Number(right.stock) > 0 ? 1 : 0;

    if (leftHasStock !== rightHasStock) {
      return rightHasStock - leftHasStock;
    }

    return left.name.localeCompare(right.name, "es-MX", { sensitivity: "base" });
  });
}

export function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumberWithThousands(value: string) {
  if (!value) {
    return "";
  }

  const normalized = normalizeMoneyInput(value);
  if (!normalized) {
    return "";
  }

  const hasTrailingDot = normalized.endsWith(".");
  const [rawInteger, rawDecimal = ""] = normalized.split(".");
  const integer = rawInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (hasTrailingDot) {
    return `${integer}.`;
  }

  return rawDecimal ? `${integer}.${rawDecimal}` : integer;
}

export function normalizeMoneyInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) {
    return "";
  }

  const firstDotIndex = cleaned.indexOf(".");
  const integerSource = firstDotIndex === -1 ? cleaned : cleaned.slice(0, firstDotIndex);
  const decimalSource = firstDotIndex === -1 ? "" : cleaned.slice(firstDotIndex + 1).replace(/\./g, "");

  const normalizedInteger = integerSource.replace(/^0+(?=\d)/, "") || "0";
  const normalizedDecimal = decimalSource.slice(0, 2);

  if (firstDotIndex !== -1) {
    return `${normalizedInteger}.${normalizedDecimal}`;
  }

  return normalizedInteger;
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getCostPriceFieldKey(product: ProductDetail | null | undefined) {
  if (!product) {
    return "cost_price";
  }

  if (typeof product.cost_price === "string" || product.cost_price === null) {
    return "cost_price";
  }

  if (typeof product.purchase_price === "string" || product.purchase_price === null) {
    return "purchase_price";
  }

  if (typeof product.unit_cost === "string" || product.unit_cost === null) {
    return "unit_cost";
  }

  return "cost_price";
}

export function getAdditionalPriceKeys(product: ProductDetail | null | undefined, excludedKeys: string[] = []) {
  if (!product) {
    return [];
  }

  return Object.entries(product)
    .filter(
      ([key, value]) =>
        key.endsWith("_price") &&
        key !== "default_price" &&
        !excludedKeys.includes(key) &&
        (typeof value === "string" || value === null),
    )
    .map(([key]) => key)
    .sort((left, right) => left.localeCompare(right));
}

export function createEmptyProductFormState(): ProductFormState {
  return {
    sku: "",
    name: "",
    stock: "0",
    default_price: "",
    brand: null,
    brand_name: "",
    product_type: null,
    product_type_name: "",
    extraPrices: { cost_price: "" },
  };
}

export function createProductFormState(product: ProductDetail): ProductFormState {
  const costPriceKey = getCostPriceFieldKey(product);
  const extraPriceKeys = new Set([...getAdditionalPriceKeys(product), costPriceKey]);
  const extraPrices = Object.fromEntries(
    [...extraPriceKeys].map((key) => [key, typeof product[key] === "string" ? (product[key] as string) : ""]),
  );

  return {
    sku: product.sku,
    name: product.name,
    stock: product.stock,
    default_price: product.default_price,
    brand: product.brand ?? null,
    brand_name: product.brand_name ?? "",
    product_type: product.product_type ?? null,
    product_type_name: product.product_type_name ?? "",
    extraPrices,
  };
}

function validateNonNegativeNumber(rawValue: string, label: string) {
  if (!rawValue.trim()) {
    return `${label} es obligatorio.`;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return `${label} debe ser un numero mayor o igual a 0.`;
  }

  return undefined;
}

export function validateProductForm(form: ProductFormState): ProductFormErrors {
  const errors: ProductFormErrors = {};

  if (!form.name.trim()) {
    errors.name = "Nombre es obligatorio.";
  }

  if (!form.sku.trim()) {
    errors.sku = "SKU es obligatorio.";
  }

  errors.stock = validateNonNegativeNumber(form.stock, "Stock");
  errors.default_price = validateNonNegativeNumber(form.default_price, "Precio");

  const extraPrices = Object.fromEntries(
    Object.entries(form.extraPrices)
      .map(([key, value]) => {
        if (!value.trim()) {
          return [key, ""];
        }

        const message = validateNonNegativeNumber(value, humanizeFieldName(key));
        return [key, message ?? ""];
      })
      .filter(([, value]) => value),
  );

  if (Object.keys(extraPrices).length > 0) {
    errors.extraPrices = extraPrices;
  }

  return errors;
}

export function humanizeFieldName(field: string) {
  return field.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getProfitMetrics(costPriceValue: string | null | undefined, salePriceValue: string | null | undefined): ProfitMetrics {
  const parsedCost = Number(costPriceValue);
  const parsedSale = Number(salePriceValue);
  const baseCostPrice = Number.isFinite(parsedCost) ? parsedCost : null;
  const salePrice = Number.isFinite(parsedSale) ? parsedSale : null;

  if (baseCostPrice === null || salePrice === null) {
    return {
      baseCostPrice,
      salePrice,
      costPriceWithTax: baseCostPrice === null ? null : roundMoney(baseCostPrice * (1 + IVA_RATE)),
      profitAmount: null,
      profitPercentage: null,
    };
  }

  const costPriceWithTax = roundMoney(baseCostPrice * (1 + IVA_RATE));
  const profitAmount = roundMoney(salePrice - costPriceWithTax);
  const profitPercentage = costPriceWithTax > 0 ? (profitAmount / costPriceWithTax) * 100 : null;

  return {
    baseCostPrice,
    salePrice,
    costPriceWithTax,
    profitAmount,
    profitPercentage,
  };
}

export function extractFieldMessage(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(" ");
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((item) => extractFieldMessage(item))
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

export function applyApiFieldErrors(errors: ProductFormErrors, fields: Record<string, unknown>) {
  const nextErrors: ProductFormErrors = {
    ...errors,
    extraPrices: { ...(errors.extraPrices ?? {}) },
  };

  Object.entries(fields).forEach(([key, value]) => {
    const message = extractFieldMessage(value);
    if (!message) {
      return;
    }

    if (key === "sku" || key === "name" || key === "stock" || key === "default_price") {
      (nextErrors as Record<string, unknown>)[key] = message;
      return;
    }

    if (key === "brand" || key === "product_type") {
      (nextErrors as Record<string, unknown>)[key] = message;
      return;
    }

    if (key.endsWith("_price")) {
      nextErrors.extraPrices = {
        ...(nextErrors.extraPrices ?? {}),
        [key]: message,
      };
    }
  });

  if (nextErrors.extraPrices && Object.keys(nextErrors.extraPrices).length === 0) {
    delete nextErrors.extraPrices;
  }

  return nextErrors;
}

export function toProductCreatePayload(form: ProductFormState): ProductCreatePayload {
  const payload: ProductCreatePayload = {
    sku: form.sku.trim(),
    name: form.name.trim(),
    default_price: normalizeMoneyInput(form.default_price.trim()),
    brand: form.brand,
    product_type: form.product_type,
  };

  const costPrice = form.extraPrices.cost_price?.trim();
  if (costPrice) {
    payload.cost_price = normalizeMoneyInput(costPrice);
  }

  const stock = form.stock.trim();
  if (stock && Number(stock) > 0) {
    payload.stock = stock;
    payload.stock_adjust_reason = "Inventario inicial";
  }

  return payload;
}

export function toProductUpdatePayload(form: ProductFormState): ProductUpdatePayload {
  const payload: ProductUpdatePayload = {
    sku: form.sku.trim(),
    name: form.name.trim(),
    stock: form.stock.trim(),
    default_price: normalizeMoneyInput(form.default_price.trim()),
    brand: form.brand,
    product_type: form.product_type,
  };

  Object.entries(form.extraPrices).forEach(([key, value]) => {
    payload[key] = value.trim() ? normalizeMoneyInput(value.trim()) : null;
  });

  return payload;
}
