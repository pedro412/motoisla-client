export type PaymentMethod = "CASH" | "CARD";
export type CardType = "NORMAL" | "MSI_3";

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
  card_type?: CardType;
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
  confirmed_at: string | null;
  voided_at: string | null;
  lines: SaleLineInput[];
  payments: SalePaymentInput[];
}
