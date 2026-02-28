import type { ChipProps } from "@mui/material";

import type { InventoryMovementType } from "@/lib/types/inventory";

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  import_batch_confirm: "Alta por importacion",
  purchase_receipt: "Alta por compra",
  sale_confirm: "Venta",
  sale_void: "Reverso de venta",
  manual_stock_adjustment: "Ajuste manual",
  manual_adjustment: "Ajuste manual",
  product_create_adjustment: "Ajuste inicial",
  layaway_reserve: "Apartado",
  layaway_expire: "Liberacion apartado",
};

const MOVEMENT_TYPE_LABELS: Record<InventoryMovementType, string> = {
  INBOUND: "Entrada",
  OUTBOUND: "Salida",
  ADJUSTMENT: "Ajuste",
  RESERVED: "Reservado",
  RELEASED: "Liberado",
};

const MOVEMENT_TYPE_COLORS: Record<InventoryMovementType, ChipProps["color"]> = {
  INBOUND: "success",
  OUTBOUND: "error",
  ADJUSTMENT: "warning",
  RESERVED: "info",
  RELEASED: "default",
};

export function formatMovementType(type: InventoryMovementType) {
  return MOVEMENT_TYPE_LABELS[type] ?? type;
}

export function getMovementTypeColor(type: InventoryMovementType): ChipProps["color"] {
  return MOVEMENT_TYPE_COLORS[type] ?? "default";
}

export function formatInventoryReferenceType(referenceType: string) {
  return REFERENCE_TYPE_LABELS[referenceType] ?? referenceType;
}

export function formatInventoryDelta(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }

  const normalized = numeric.toFixed(2);
  return numeric > 0 ? `+${normalized}` : normalized;
}

export function formatReferenceId(referenceId: string) {
  if (!referenceId) {
    return "-";
  }

  return referenceId.length <= 8 ? referenceId : referenceId.slice(0, 8);
}
