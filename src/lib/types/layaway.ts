import type { Customer, CustomerCreditSummary } from "@/lib/types/customer";
import type { CardType, PaymentMethod } from "@/lib/types/sales";

export type LayawayStatus = "ACTIVE" | "SETTLED" | "EXPIRED" | "REFUNDED";

export interface LayawayLineInput {
  product: string;
  qty: string;
  unit_price: string;
  unit_cost: string;
  discount_pct: string;
}

export interface LayawayPaymentInput {
  method: PaymentMethod;
  amount: string;
  card_plan_id?: string | null;
  card_type?: CardType | "";
  commission_rate?: string | null;
  card_plan_code?: string;
  card_plan_label?: string;
  installments_months?: number;
}

export interface LayawayCreatePayload {
  customer: {
    phone: string;
    name: string;
    notes?: string;
  };
  lines: LayawayLineInput[];
  deposit_payments: LayawayPaymentInput[];
  expires_at: string;
  notes?: string;
}

export interface LayawayPayment {
  id: string;
  method: PaymentMethod;
  amount: string;
  card_type: CardType | "" | null;
  card_plan_label: string;
  installments_months: number;
  commission_rate: string | null;
  reference_type: string;
  reference_id: string;
  created_at: string;
}

export interface LayawayLine {
  id: string;
  product: string;
  product_sku?: string;
  product_name?: string;
  qty: string;
  unit_price: string;
  unit_cost: string;
  discount_pct: string;
  created_at: string;
}

export interface LayawayExtensionLog {
  id: string;
  old_expires_at: string;
  new_expires_at: string;
  reason: string;
  created_by: string;
  created_by_username: string;
  created_at: string;
}

export interface LayawayDetailResponse {
  id: string;
  customer: Customer | null;
  customer_name: string;
  customer_phone: string;
  subtotal: string;
  total: string;
  amount_paid: string;
  total_price: string;
  deposit_amount: string;
  expires_at: string;
  status: LayawayStatus;
  notes: string;
  settled_sale_id: string | null;
  created_at: string;
  updated_at: string;
  lines: LayawayLine[];
  payments: LayawayPayment[];
  extensions: LayawayExtensionLog[];
  balance_due: string;
  customer_credit_balance: string;
}

export type LayawayListItem = LayawayDetailResponse;

export interface LayawayPaymentSubmitPayload {
  payments: LayawayPaymentInput[];
}

export interface LayawayExtendPayload {
  new_expires_at: string;
  reason?: string;
}

export interface CustomerLookupResponse {
  customer: Customer | null;
  credit: CustomerCreditSummary | null;
}
