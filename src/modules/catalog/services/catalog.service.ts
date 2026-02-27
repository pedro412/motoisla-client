import { httpClient } from "@/lib/api/http-client";
import type { PaginatedResponse } from "@/lib/types/api";
import type { PublicCatalogProduct } from "@/lib/types/catalog";

export const catalogService = {
  searchCatalog(params: { q?: string; page?: number }) {
    return httpClient.get<PaginatedResponse<PublicCatalogProduct>>("/public/catalog/", {
      q: params.q,
      page: params.page,
    });
  },

  getCatalogBySku(sku: string) {
    return httpClient.get<PublicCatalogProduct>(`/public/catalog/${encodeURIComponent(sku)}/`);
  },
};
