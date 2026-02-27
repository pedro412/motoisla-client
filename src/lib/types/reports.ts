export interface MetricsTopProduct {
  product_id: string;
  product__sku: string;
  product__name: string;
  units_sold: string;
  sales_amount: string;
}

export interface PaymentMethodBreakdown {
  method: string;
  total_amount: string;
  transactions: number;
}

export interface CardTypeBreakdown {
  card_type: string | null;
  total_amount: string;
  transactions: number;
}

export interface MetricsResponse {
  total_sales: string;
  avg_ticket: string;
  sales_count: number;
  range: { date_from: string | null; date_to: string | null };
  top_products: MetricsTopProduct[];
  payment_breakdown: {
    by_method: PaymentMethodBreakdown[];
    card_types: CardTypeBreakdown[];
  };
}

export interface SalesByDayRow {
  confirmed_at__date: string;
  total_sales: string;
  sales_count: number;
}

export interface SalesByCashierRow {
  cashier_id: string;
  cashier__username: string;
  total_sales: string;
  sales_count: number;
  avg_ticket: string;
}

export interface ExpenseCategorySummary {
  category: string;
  total_amount: string;
  items_count: number;
}

export interface SalesReportResponse extends MetricsResponse {
  sales_by_day: SalesByDayRow[];
  sales_by_cashier: SalesByCashierRow[];
  expenses_summary: {
    total_expenses: string;
    expenses_count: number;
    by_category: ExpenseCategorySummary[];
  };
  net_sales_after_expenses: string;
}
