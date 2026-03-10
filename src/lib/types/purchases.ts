import type { PaginatedResponse } from "@/lib/types/api";

export interface Supplier {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface SupplierParser {
  id: string;
  supplier: string;
  parser_key: string;
  version: number;
  description: string;
  is_active: boolean;
}

export type MatchStatus = "NEW_PRODUCT" | "MATCHED_PRODUCT" | "AMBIGUOUS" | "INVALID";

export interface ImportLinePreviewImage {
  id: string;
  preview_url: string;
  width: number;
  height: number;
  file?: File;
  existing_asset_id?: string;
}

export interface ImportLine {
  id: string;
  line_no: number;
  raw_line: string;
  parsed_sku: string;
  parsed_name: string;
  parsed_qty: string | null;
  parsed_unit_cost: string | null;
  parsed_unit_price: string | null;
  sku: string;
  name: string;
  qty: string | null;
  unit_cost: string | null;
  unit_price: string | null;
  public_price: string | null;
  brand_name: string;
  product_type_name: string;
  brand: string | null;
  product_type: string | null;
  matched_product: string | null;
  match_status: MatchStatus;
  is_selected: boolean;
  notes: string;

  preview_images?: ImportLinePreviewImage[];
}

export interface ImportBatch {
  id: string;
  supplier: string;
  parser: string;
  raw_text: string;
  status: "DRAFT" | "PARSED" | "CONFIRMED" | "CANCELLED" | "ERROR";
  invoice_number: string | null;
  invoice_date: string | null;
  subtotal: string | null;
  tax: string | null;
  total: string | null;
  lines: ImportLine[];
}

export type SupplierListResponse = PaginatedResponse<Supplier>;
export type SupplierParserListResponse = PaginatedResponse<SupplierParser>;

export interface PurchaseReceiptLine {
  id: string;
  product: string;
  product_sku: string;
  product_name: string;
  qty: string;
  unit_cost: string;
  unit_price: string | null;
}

export interface PurchaseReceipt {
  id: string;
  supplier: string;
  supplier_name: string;
  supplier_code: string;
  invoice_number: string | null;
  invoice_date: string | null;
  status: "DRAFT" | "POSTED" | "VOID";
  subtotal: string | null;
  tax: string | null;
  total: string | null;
  source_import_batch: string | null;
  created_by: string;
  created_by_username: string;
  can_delete: boolean;
  posted_at: string | null;
  created_at: string;
  lines: PurchaseReceiptLine[];
}

export type PurchaseReceiptListResponse = PaginatedResponse<PurchaseReceipt>;

export interface PreviewConfirmLinePayload {
  sku: string;
  name: string;
  qty: string | null;
  unit_cost: string | null;
  unit_price: string | null;
  public_price: string | null;
  brand_name: string;
  product_type_name: string;
  brand_id?: string;
  product_type_id?: string;
  is_selected: boolean;
  notes: string;
}

export interface PreviewConfirmPayload {
  supplier: string;
  parser: string;
  invoice_number?: string;
  invoice_date?: string;
  subtotal?: string;
  tax?: string;
  total?: string;
  raw_text: string;
  lines: PreviewConfirmLinePayload[];
}
