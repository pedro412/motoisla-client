import type { PaginatedResponse } from "@/lib/types/api";

export type InventoryMovementType = "INBOUND" | "OUTBOUND" | "ADJUSTMENT" | "RESERVED" | "RELEASED";

export interface InventoryMovementItem {
  id: string;
  product: string;
  product_sku?: string;
  product_name?: string;
  movement_type: InventoryMovementType;
  quantity_delta: string;
  reference_type: string;
  reference_id: string;
  note: string;
  created_by: string;
  created_by_username?: string;
  created_at: string;
}

export type InventoryMovementListResponse = PaginatedResponse<InventoryMovementItem>;
