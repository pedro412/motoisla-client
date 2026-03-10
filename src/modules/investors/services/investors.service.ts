import { httpClient } from "@/lib/api/http-client";
import { ApiError } from "@/lib/api/errors";
import type {
  InvestorAssignmentsResponse,
  InvestorCapitalOperationPayload,
  InvestorCreatePayload,
  InvestorDetail,
  InvestorLedgerEntry,
  InvestorLedgerFilters,
  InvestorLedgerResponse,
  InvestorPurchasePayload,
  InvestorPurchaseResponse,
  InvestorsListResponse,
} from "@/lib/types/investors";

export const investorsService = {
  getMyInvestor() {
    return httpClient.get<InvestorDetail>("/investors/me/");
  },

  getMyInvestorLedger(params: InvestorLedgerFilters) {
    return httpClient.get<InvestorLedgerResponse>("/investors/me/ledger/", {
      page: params.page,
      entry_type: params.entry_type || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
    });
  },

  async listMyInvestorAssignments(params: { investorId?: string; page?: number }) {
    try {
      return await httpClient.get<InvestorAssignmentsResponse>("/investors/me/assignments/", {
        page: params.page,
      });
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }

      const canTryLegacyEndpoint = (error.status === 404 || error.status === 405) && Boolean(params.investorId);
      if (!canTryLegacyEndpoint) {
        throw error;
      }

      return httpClient.get<InvestorAssignmentsResponse>("/investors/assignments/", {
        investor: params.investorId,
        page: params.page,
      });
    }
  },

  listInvestors(params: { q?: string; page?: number }) {
    return httpClient.get<InvestorsListResponse>("/investors/", {
      q: params.q,
      page: params.page,
    });
  },

  getInvestor(id: string) {
    return httpClient.get<InvestorDetail>(`/investors/${id}/`);
  },

  createInvestor(payload: InvestorCreatePayload) {
    return httpClient.post<InvestorCreatePayload, InvestorDetail>("/investors/", payload);
  },

  listInvestorAssignments(params: { investor: string; page?: number }) {
    return httpClient.get<InvestorAssignmentsResponse>("/investors/assignments/", {
      investor: params.investor,
      page: params.page,
    });
  },

  getInvestorLedger(id: string, params: InvestorLedgerFilters) {
    return httpClient.get<InvestorLedgerResponse>(`/investors/${id}/ledger/`, {
      page: params.page,
      entry_type: params.entry_type || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
    });
  },

  purchaseProducts(id: string, payload: InvestorPurchasePayload) {
    return httpClient.post<InvestorPurchasePayload, InvestorPurchaseResponse>(`/investors/${id}/purchases/`, payload);
  },

  depositCapital(id: string, payload: InvestorCapitalOperationPayload) {
    return httpClient.post<InvestorCapitalOperationPayload, InvestorLedgerEntry>(`/investors/${id}/deposit/`, payload);
  },

  withdrawCapital(id: string, payload: InvestorCapitalOperationPayload) {
    return httpClient.post<InvestorCapitalOperationPayload, InvestorLedgerEntry>(`/investors/${id}/withdraw/`, payload);
  },

  reinvestProfit(id: string, payload: InvestorCapitalOperationPayload) {
    return httpClient.post<InvestorCapitalOperationPayload, InvestorLedgerEntry>(`/investors/${id}/reinvest/`, payload);
  },
};
