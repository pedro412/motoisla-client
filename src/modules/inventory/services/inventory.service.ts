import { httpClient } from "@/lib/api/http-client";
import type { InventoryMovementListResponse } from "@/lib/types/inventory";

export const inventoryService = {
  listMovements(params: { product: string; page?: number }) {
    return httpClient.get<InventoryMovementListResponse>("/inventory/movements/", {
      product: params.product,
      page: params.page,
    });
  },
};
