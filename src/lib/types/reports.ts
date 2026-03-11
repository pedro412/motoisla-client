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

export interface CardInstrumentBreakdown {
  card_instrument: string | null;
  total_amount: string;
  transactions: number;
}

export interface MetricsResponse {
  total_sales: string;
  avg_ticket: string;
  sales_count: number;
  gross_profit: string;
  gross_profit_total: string;
  purchase_spend: string;
  purchase_count: number;
  investor_metrics: {
    investor_backed_sales_total: string;
    store_owned_sales_total: string;
    investor_profit_share_total: string;
    store_profit_share_total: string;
    inventory_cost_assigned_to_investors: string;
    store_net_inventory_exposure_change: string;
  };
  inventory_snapshot: {
    cost_value: string;
    retail_value: string;
    potential_profit: string;
    total_units: string;
    gross_margin_pct: string;
    store_owned_units: string;
    investor_assigned_units: string;
    store_owned_cost_value: string;
    investor_assigned_cost_value: string;
    store_owned_potential_profit: string;
    investor_assigned_potential_profit: string;
  };
  range: { date_from: string | null; date_to: string | null };
  top_products: MetricsTopProduct[];
  payment_breakdown: {
    by_method: PaymentMethodBreakdown[];
    card_types: CardTypeBreakdown[];
    card_instruments: CardInstrumentBreakdown[];
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
  net_profit: string;
  profitability_metrics?: {
    operating_cost_rate_avg: string;
    operating_cost_total_allocated: string;
    fallback_usage_count: number;
  };
}
