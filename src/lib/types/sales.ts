export type PaymentMethod = "CASH" | "CARD";
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
  override_admin_username?: string;
  override_admin_password?: string;
  override_reason?: string;
}

export interface SaleResponse {
  id: string;
  status: "DRAFT" | "CONFIRMED" | "VOID";
  subtotal: string;
  discount_amount: string;
  total: string;
  created_at: string;
  confirmed_at: string | null;
  voided_at: string | null;
  lines: SaleLineInput[];
  payments: SalePaymentInput[];
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
  payments: SaleHistoryPayment[];
  void_reason: string | null;
  can_void: boolean;
}
