import { httpClient } from "@/lib/api/http-client";
import type { PaginatedResponse } from "@/lib/types/api";
import type {
  LayawayCreatePayload,
  LayawayDetailResponse,
  LayawayExtendPayload,
  LayawayListItem,
  LayawayPaymentSubmitPayload,
} from "@/lib/types/layaway";

export const layawayService = {
  listLayaways(params?: {
    page?: number;
    status?: string;
    q?: string;
    customer_phone?: string;
    due_today?: boolean;
    expired?: boolean;
    exclude_settled?: boolean;
  }) {
    return httpClient.get<PaginatedResponse<LayawayListItem>>("/layaways/", {
      page: params?.page,
      status: params?.status,
      q: params?.q,
      customer_phone: params?.customer_phone,
      due_today: params?.due_today ? "true" : undefined,
      expired: params?.expired ? "true" : undefined,
      exclude_settled: params?.exclude_settled ? "true" : undefined,
    });
  },

  getLayaway(id: string) {
    return httpClient.get<LayawayDetailResponse>(`/layaways/${id}/`);
  },

  createLayaway(payload: LayawayCreatePayload) {
    return httpClient.post<LayawayCreatePayload, LayawayDetailResponse>("/layaways/", payload);
  },

  addPayments(id: string, payload: LayawayPaymentSubmitPayload) {
    return httpClient.post<LayawayPaymentSubmitPayload, LayawayDetailResponse>(`/layaways/${id}/payments/`, payload);
  },

  settleLayaway(id: string, payload: LayawayPaymentSubmitPayload) {
    return httpClient.post<LayawayPaymentSubmitPayload, LayawayDetailResponse>(`/layaways/${id}/settle/`, payload);
  },

  extendLayaway(id: string, payload: LayawayExtendPayload) {
    return httpClient.post<LayawayExtendPayload, LayawayDetailResponse>(`/layaways/${id}/extend/`, payload);
  },

  expireLayaway(id: string, payload?: { force?: boolean }) {
    return httpClient.post<{ force?: boolean }, LayawayDetailResponse>(`/layaways/${id}/expire/`, payload ?? {});
  },
};
