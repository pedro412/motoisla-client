import { httpClient } from "@/lib/api/http-client";
import type {
  ExpenseCreatePayload,
  ExpenseListResponse,
  ExpenseSummaryResponse,
  ExpenseUpdatePayload,
  FixedExpenseGenerateResponse,
  FixedExpenseTemplateListResponse,
  FixedExpenseTemplatePayload,
  FixedExpenseTemplate,
  Expense,
} from "@/lib/types/expenses";

export const expensesService = {
  listExpenses(params?: {
    month?: string;
    status?: string;
    expense_type?: string;
    category?: string;
    template?: string;
    page?: number;
  }) {
    return httpClient.get<ExpenseListResponse>("/expenses/", {
      month: params?.month,
      status: params?.status,
      expense_type: params?.expense_type,
      category: params?.category,
      template: params?.template,
      page: params?.page,
    });
  },

  createExpense(payload: ExpenseCreatePayload) {
    return httpClient.post<ExpenseCreatePayload, Expense>("/expenses/", payload);
  },

  updateExpense(id: string, payload: ExpenseUpdatePayload) {
    return httpClient.patch<ExpenseUpdatePayload, Expense>(`/expenses/${id}/`, payload);
  },

  getExpenseSummary(month: string) {
    return httpClient.get<ExpenseSummaryResponse>("/expenses/summary/", { month });
  },

  generateFixedExpenses(month: string) {
    return httpClient.post<{ month: string }, FixedExpenseGenerateResponse>("/expenses/generate-fixed/", { month });
  },

  listFixedExpenseTemplates(params?: {
    is_active?: boolean;
    category?: string;
    q?: string;
    page?: number;
  }) {
    return httpClient.get<FixedExpenseTemplateListResponse>("/fixed-expense-templates/", {
      is_active: params?.is_active === undefined ? undefined : params.is_active ? "true" : "false",
      category: params?.category,
      q: params?.q,
      page: params?.page,
    });
  },

  createFixedExpenseTemplate(payload: FixedExpenseTemplatePayload) {
    return httpClient.post<FixedExpenseTemplatePayload, FixedExpenseTemplate>("/fixed-expense-templates/", payload);
  },

  updateFixedExpenseTemplate(id: string, payload: Partial<FixedExpenseTemplatePayload>) {
    return httpClient.patch<Partial<FixedExpenseTemplatePayload>, FixedExpenseTemplate>(`/fixed-expense-templates/${id}/`, payload);
  },
};
