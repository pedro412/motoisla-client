import type { PaginatedResponse } from "@/lib/types/api";

export interface ProductImageItem {
  id: string;
  asset_id: string;
  is_primary: boolean;
  sort_order: number;
  original_url: string;
  thumb_url: string;
  width: number;
  height: number;
  mime_type: string;
}

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
  primary_image_id: string | null;
  images: ProductImageItem[];
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
}

export interface MediaUploadFileMeta {
  filename: string;
  mime: string;
  size: number;
  width: number;
  height: number;
}

export interface MediaUploadPresignPayload {
  original: MediaUploadFileMeta;
  thumb: MediaUploadFileMeta;
}

export interface MediaUploadTarget {
  method: "PUT";
  url: string;
  headers: Record<string, string>;
  object_key: string;
}

export interface MediaUploadPresignResponse {
  upload_token: string;
  original: MediaUploadTarget;
  thumb: MediaUploadTarget;
}

export interface MediaAssetResponse {
  id: string;
  provider: string;
  status: string;
  original_url: string;
  thumb_url: string;
  mime_type: string;
  width: number;
  height: number;
  size_bytes: number;
}

export interface MediaUploadCompleteResponse {
  asset_id: string;
  asset: MediaAssetResponse;
}

export interface ProductImageAttachPayload {
  asset_id: string;
  is_primary?: boolean;
  sort_order?: number;
}

export interface ProductImageUpdatePayload {
  is_primary?: boolean;
  sort_order?: number;
}

export type ProductListResponse = PaginatedResponse<ProductListItem>;
