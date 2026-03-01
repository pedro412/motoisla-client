export interface Customer {
  id: string;
  phone: string;
  phone_normalized: string;
  name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreditSummary {
  id: string;
  customer: Customer | null;
  customer_name: string;
  customer_phone: string;
  balance: string;
  updated_at: string;
}
