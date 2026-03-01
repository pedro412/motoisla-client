import { httpClient } from "@/lib/api/http-client";
import type { PaginatedResponse } from "@/lib/types/api";
import type { CardCommissionPlan, ProductSearchItem, SaleCreatePayload, SaleHistoryItem, SaleResponse } from "@/lib/types/sales";

export const salesService = {
  searchProducts(params: { q?: string; page?: number }) {
    return httpClient.get<PaginatedResponse<ProductSearchItem>>("/products/", {
      q: params.q,
      page: params.page,
    });
  },

  listCardCommissionPlans(params?: { page?: number }) {
    return httpClient.get<PaginatedResponse<CardCommissionPlan>>("/card-commission-plans/", {
      page: params?.page,
    });
  },

  listSales(params?: { page?: number }) {
    return httpClient.get<PaginatedResponse<SaleHistoryItem>>("/sales/", {
      page: params?.page,
    });
  },

  getSale(id: string) {
    return httpClient.get<SaleResponse>(`/sales/${id}/`);
  },

  createSale(payload: SaleCreatePayload) {
    return httpClient.post<SaleCreatePayload, SaleResponse>("/sales/", payload);
  },

  confirmSale(id: string) {
    return httpClient.post<Record<string, never>, SaleResponse>(`/sales/${id}/confirm/`, {});
  },

  voidSale(id: string, reason: string) {
    return httpClient.post<{ reason: string }, SaleResponse>(`/sales/${id}/void/`, { reason });
  },
};
