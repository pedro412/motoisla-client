export type PaymentMethod = "CASH" | "CARD" | "CUSTOMER_CREDIT";
export type CardType = "NORMAL" | "MSI_3";
export type ProfitabilityRateSource = "MTD_REAL" | "FALLBACK_BASE";

export interface CardCommissionPlan {
  id: string;
  code: string;
  label: string;
  installments_months: number;
  commission_rate: string;
  is_active: boolean;
  sort_order: number;
}

export interface ProductSearchItem {
  id: string;
  sku: string;
  name: string;
  default_price: string;
  stock: string;
  primary_image_id: string | null;
  images: {
    id: string;
    is_primary: boolean;
    thumb_url: string;
    original_url: string;
  }[];
}

export interface SaleLineInput {
  product: string;
  product_sku?: string;
  product_name?: string;
  qty: string;
  unit_price: string;
  unit_cost: string;
  discount_pct: string;
}

export interface SalePaymentInput {
  method: PaymentMethod;
  amount: string;
  card_plan_id?: string | null;
  card_type?: CardType;
  commission_rate?: string | null;
  card_plan_code?: string;
  card_plan_label?: string;
  installments_months?: number;
}

export interface SaleCreatePayload {
  lines: SaleLineInput[];
  payments: SalePaymentInput[];
  customer_phone?: string;
  customer_name?: string;
  override_admin_username?: string;
  override_admin_password?: string;
  override_reason?: string;
}

export interface SaleLineProfitability {
  product: string;
  line_revenue: string;
  line_cogs: string;
  line_operating_cost: string;
  line_commission_cost: string;
  line_net_profit: string;
  ownership: "STORE" | "INVESTOR";
  investor_id?: string | null;
  investor_profit_share: string;
  store_profit_share: string;
}

export interface SaleProfitabilityBreakdown {
  operating_cost_rate_snapshot: string;
  operating_cost_rate_source: ProfitabilityRateSource;
  operating_cost_amount: string;
  commission_amount: string;
  gross_profit_total: string;
  net_profit_total: string;
  investor_profit_total: string;
  store_profit_total: string;
  lines: SaleLineProfitability[];
}

export interface SaleProfitabilityPreviewPayload {
  lines: SaleLineInput[];
  payments: SalePaymentInput[];
}

export interface OperatingCostRateResponse {
  operating_cost_rate: string;
  rate_source: ProfitabilityRateSource;
  calculated_at: string;
}

export interface SaleResponse {
  id: string;
  status: "DRAFT" | "CONFIRMED" | "VOID";
  cashier: string;
  cashier_username: string;
  subtotal: string;
  discount_amount: string;
  total: string;
  created_at: string;
  confirmed_at: string | null;
  voided_at: string | null;
  lines: SaleLineInput[];
  payments: SalePaymentInput[];
  customer_summary: {
    id: string;
    name: string;
    phone: string;
    sales_count: number;
    confirmed_sales_count: number;
  } | null;
  profitability_breakdown?: SaleProfitabilityBreakdown | null;
}

export interface SaleHistoryPayment {
  method: PaymentMethod;
  amount: string;
  card_type: CardType | null;
  card_plan_label: string;
  installments_months: number;
  commission_rate: string | null;
}

export interface SaleHistoryItem {
  id: string;
  status: "DRAFT" | "CONFIRMED" | "VOID";
  total: string;
  created_at: string;
  confirmed_at: string | null;
  voided_at: string | null;
  cashier: string;
  cashier_username: string;
  customer_name?: string;
  customer_phone?: string;
  payments: SaleHistoryPayment[];
  void_reason: string | null;
  can_void: boolean;
}
