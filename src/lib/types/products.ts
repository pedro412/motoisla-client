import type { PaginatedResponse } from "@/lib/types/api";

export interface ProductListItem {
  id: string;
  sku: string;
  name: string;
  default_price: string;
  cost_price?: string | null;
  brand?: string | null;
  brand_name?: string;
  product_type?: string | null;
  product_type_name?: string;
  is_active?: boolean;
  stock: string;
  investor_assignable_qty?: string;
  primary_image_url: string | null;
  updated_at?: string;
  created_at?: string;
  can_delete?: boolean;
  [key: string]: unknown;
}

export interface ProductDetail extends ProductListItem {
  description?: string | null;
}

export interface ProductUpdatePayload {
  sku: string;
  name: string;
  stock: string;
  default_price: string;
  cost_price?: string | null;
  brand?: string | null;
  product_type?: string | null;
  stock_adjust_reason?: string | null;
  primary_image_url: string | null;
  [key: string]: string | null | undefined;
}

export interface ProductCreatePayload {
  sku: string;
  name: string;
  default_price: string;
  cost_price?: string | null;
  brand?: string | null;
  product_type?: string | null;
  stock?: string;
  stock_adjust_reason?: string;
  primary_image_url?: string | null;
}

export type ProductListResponse = PaginatedResponse<ProductListItem>;
