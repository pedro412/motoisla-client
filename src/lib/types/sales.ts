export type PaymentMethod = "CASH" | "CARD" | "CUSTOMER_CREDIT";
export type CardType = "NORMAL" | "MSI_3";

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
