import { describe, expect, it } from "vitest";

import type { ProductDetail, ProductListItem } from "@/lib/types/products";
import {
  addTaxToAmount,
  applyApiFieldErrors,
  createProductFormState,
  formatNumberWithThousands,
  getProfitMetrics,
  normalizeMoneyInput,
  removeTaxFromAmount,
  sortProductsForDisplay,
  toProductUpdatePayload,
  validateProductForm,
} from "@/modules/products/utils";

describe("products utils", () => {
  it("sorts products with stock first and then by name", () => {
    const products: ProductListItem[] = [
      {
        id: "3",
        sku: "SKU-3",
        name: "zeta",
        stock: "0",
        default_price: "10.00",
        primary_image_url: null,
      },
      {
        id: "2",
        sku: "SKU-2",
        name: "Alfa",
        stock: "5",
        default_price: "10.00",
        primary_image_url: null,
      },
      {
        id: "1",
        sku: "SKU-1",
        name: "beta",
        stock: "-1",
        default_price: "10.00",
        primary_image_url: null,
      },
    ];

    expect(sortProductsForDisplay(products).map((product) => product.id)).toEqual(["2", "1", "3"]);
  });

  it("validates required and non-negative fields", () => {
    const errors = validateProductForm({
      sku: "",
      name: "",
      stock: "-2",
      default_price: "-1",
      brand: null,
      brand_name: "",
      product_type: null,
      product_type_name: "",
      primary_image_url: "",
      extraPrices: {
        wholesale_price: "-5",
      },
    });

    expect(errors.sku).toContain("SKU");
    expect(errors.name).toContain("Nombre");
    expect(errors.stock).toContain("0");
    expect(errors.default_price).toContain("0");
    expect(errors.extraPrices?.wholesale_price).toContain("0");
  });

  it("creates payloads and maps backend field errors", () => {
    const product: ProductDetail = {
      id: "1",
      sku: "SKU-1",
      name: "Casco",
      stock: "4",
      default_price: "499.00",
      cost_price: "320.00",
      brand: "brand-1",
      brand_name: "LS2",
      product_type: "type-1",
      product_type_name: "CASCOS",
      wholesale_price: "450.00",
      primary_image_url: "https://example.com/casco.jpg",
      can_delete: true,
    };

    const form = createProductFormState(product);
    form.primary_image_url = "";
    form.default_price = "1,200.50";
    form.extraPrices.cost_price = "800.10";

    const payload = toProductUpdatePayload(form);
    expect(payload.primary_image_url).toBeNull();
    expect(payload.wholesale_price).toBe("450.00");
    expect(payload.default_price).toBe("1200.50");
    expect(payload.cost_price).toBe("800.10");
    expect(payload.brand).toBe("brand-1");
    expect(payload.product_type).toBe("type-1");

    const mapped = applyApiFieldErrors({}, { sku: ["SKU duplicado"], wholesale_price: ["Precio inválido"] });
    expect(mapped.sku).toBe("SKU duplicado");
    expect(mapped.extraPrices?.wholesale_price).toBe("Precio inválido");
  });

  it("normalizes and formats money input values", () => {
    expect(normalizeMoneyInput("0010,203.3399")).toBe("10203.33");
    expect(formatNumberWithThousands("10203.33")).toBe("10,203.33");
    expect(formatNumberWithThousands("1000")).toBe("1,000");
    expect(addTaxToAmount("100.00")).toBe("116.00");
    expect(removeTaxFromAmount("116.00")).toBe("100.00");
  });

  it("computes utility from cost and sale prices", () => {
    const metrics = getProfitMetrics("800.00", "1000.00");

    expect(metrics.baseCostPrice).toBe(800);
    expect(metrics.salePrice).toBe(1000);
    expect(metrics.costPriceWithTax).toBe(928);
    expect(metrics.profitAmount).toBe(72);
    expect(metrics.profitPercentage).toBeCloseTo(7.7586, 4);
  });
});
