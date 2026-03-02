import type { PaginatedResponse } from "@/lib/types/api";

export type ExpenseType = "FIXED" | "VARIABLE";
export type ExpenseStatus = "PENDING" | "PAID" | "CANCELLED";

export interface FixedExpenseTemplate {
  id: string;
  name: string;
  category: string;
  default_amount: string;
  description: string;
  charge_day: number;
  is_active: boolean;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string;
  expense_date: string;
  expense_type: ExpenseType;
  status: ExpenseStatus;
  template: string | null;
  template_name: string;
  due_date: string | null;
  paid_at: string | null;
  month_bucket: string;
  paid_by: string | null;
  paid_by_username: string;
  created_by: string;
  created_by_username: string;
  created_at: string;
}

export interface ExpenseCategorySummary {
  category: string;
  total_amount: string;
  items_count: number;
}

export interface ExpenseSummaryResponse {
  month: string;
  fixed_pending_total: string;
  fixed_paid_total: string;
  variable_paid_total: string;
  actual_paid_total: string;
  pending_commitments_total: string;
  fixed_pending_count: number;
  fixed_paid_count: number;
  variable_paid_count: number;
  by_category_paid: ExpenseCategorySummary[];
  by_category_pending: ExpenseCategorySummary[];
}

export interface FixedExpenseGenerateResponse {
  month: string;
  created_count: number;
  existing_count: number;
  summary: ExpenseSummaryResponse;
}

export interface ExpenseCreatePayload {
  category: string;
  description: string;
  amount: string;
  expense_date: string;
  expense_type?: ExpenseType;
  status?: ExpenseStatus;
  due_date?: string;
}

export interface ExpenseUpdatePayload {
  category?: string;
  description?: string;
  amount?: string;
  expense_date?: string;
  status?: ExpenseStatus;
  due_date?: string;
}

export interface FixedExpenseTemplatePayload {
  name: string;
  category: string;
  default_amount: string;
  description?: string;
  charge_day: number;
  is_active: boolean;
  notes?: string;
}

export type ExpenseListResponse = PaginatedResponse<Expense>;
export type FixedExpenseTemplateListResponse = PaginatedResponse<FixedExpenseTemplate>;
