import { httpClient } from "@/lib/api/http-client";
import type { PaginatedResponse } from "@/lib/types/api";
import type { Customer, CustomerCreditSummary } from "@/lib/types/customer";

export const customerService = {
  listCustomers(params?: { q?: string; phone?: string; page?: number }) {
    return httpClient.get<PaginatedResponse<Customer>>("/customers/", {
      q: params?.q,
      phone: params?.phone,
      page: params?.page,
    });
  },

  async getCustomerByPhone(phone: string) {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      return null;
    }
    const response = await this.listCustomers({ phone: normalizedPhone, page: 1 });
    return response.results[0] ?? null;
  },

  listCredits(params?: { customerPhone?: string; page?: number }) {
    return httpClient.get<PaginatedResponse<CustomerCreditSummary>>("/customer-credits/", {
      customer_phone: params?.customerPhone,
      page: params?.page,
    });
  },

  async getCreditByPhone(phone: string) {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      return null;
    }
    const response = await this.listCredits({ customerPhone: normalizedPhone, page: 1 });
    return response.results[0] ?? null;
  },
};
