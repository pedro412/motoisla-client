import { describe, expect, it } from "vitest";

import {
  formatInventoryDelta,
  formatInventoryReferenceType,
  formatMovementType,
  formatReferenceId,
  getMovementTypeColor,
} from "@/modules/inventory/utils";

describe("inventory utils", () => {
  it("formats movement types to human readable labels", () => {
    expect(formatMovementType("INBOUND")).toBe("Entrada");
    expect(formatMovementType("OUTBOUND")).toBe("Salida");
    expect(getMovementTypeColor("ADJUSTMENT")).toBe("warning");
  });

  it("formats reference types to business labels", () => {
    expect(formatInventoryReferenceType("import_batch_confirm")).toBe("Alta por importacion");
    expect(formatInventoryReferenceType("sale_confirm")).toBe("Venta");
    expect(formatInventoryReferenceType("custom_reference")).toBe("custom_reference");
  });

  it("formats inventory delta with explicit sign and truncates reference ids", () => {
    expect(formatInventoryDelta("5")).toBe("+5.00");
    expect(formatInventoryDelta("-1")).toBe("-1.00");
    expect(formatReferenceId("1234567890")).toBe("12345678");
    expect(formatReferenceId("abc123")).toBe("abc123");
  });
});
