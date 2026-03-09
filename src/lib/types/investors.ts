import type { PaginatedResponse } from "@/lib/types/api";

export interface InvestorBalances {
  capital: string;
  inventory: string;
  profit: string;
}

export interface InvestorSummary {
  id: string;
  user: string | null;
  display_name: string;
  is_active: boolean;
  balances: InvestorBalances;
}

export type InvestorDetail = InvestorSummary;

export interface InvestorAssignmentItem {
  id: string;
  investor: string;
  product: string;
  product_sku: string;
  product_name: string;
  qty_assigned: string;
  qty_sold: string;
  qty_available: string;
  unit_cost: string;
  line_total: string;
  created_at: string;
}

export type InvestorLedgerEntryType =
  | "CAPITAL_DEPOSIT"
  | "CAPITAL_WITHDRAWAL"
  | "CAPITAL_TO_INVENTORY"
  | "INVENTORY_TO_CAPITAL"
  | "PROFIT_SHARE"
  | "REINVESTMENT";

export interface InvestorLedgerEntry {
  id: string;
  investor: string;
  entry_type: InvestorLedgerEntryType;
  capital_delta: string;
  inventory_delta: string;
  profit_delta: string;
  reference_type: string;
  reference_id: string;
  note: string;
  created_at: string;
}

export interface InvestorCreatePayload {
  display_name: string;
  initial_capital?: string;
  is_active?: boolean;
}

export interface InvestorPurchasePayload {
  tax_rate_pct: string;
  lines: Array<{
    product: string;
    qty: string;
    unit_cost_gross: string;
  }>;
}

export interface InvestorCapitalOperationPayload {
  amount: string;
  note?: string;
}

export interface InvestorPurchaseResponse {
  investor_id: string;
  purchase_total: string;
  balances: InvestorBalances;
  assignments: InvestorAssignmentItem[];
  ledger_entries: InvestorLedgerEntry[];
}

export interface InvestorLedgerTotals {
  capital_total: string;
  inventory_total: string;
  profit_total: string;
}

export interface InvestorLedgerFilters {
  entry_type?: InvestorLedgerEntryType;
  date_from?: string;
  date_to?: string;
  page?: number;
}

export type InvestorsListResponse = PaginatedResponse<InvestorSummary>;
export type InvestorAssignmentsResponse = PaginatedResponse<InvestorAssignmentItem>;
export type InvestorLedgerResponse = PaginatedResponse<InvestorLedgerEntry> & { totals?: InvestorLedgerTotals };
