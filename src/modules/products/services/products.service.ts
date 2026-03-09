import { httpClient } from "@/lib/api/http-client";
import type { ProductCreatePayload, ProductDetail, ProductListResponse, ProductUpdatePayload } from "@/lib/types/products";

export const productsService = {
  listProducts(params: { q?: string; page?: number; brand?: string; product_type?: string; has_stock?: boolean; include_inactive?: boolean }) {
    return httpClient.get<ProductListResponse>("/products/", {
      q: params.q,
      page: params.page,
      brand: params.brand,
      product_type: params.product_type,
      has_stock: params.has_stock === undefined ? undefined : params.has_stock ? "true" : "false",
      include_inactive: params.include_inactive ? "true" : undefined,
    });
  },

  getProduct(id: string) {
    return httpClient.get<ProductDetail>(`/products/${id}/`);
  },

  createProduct(payload: ProductCreatePayload) {
    return httpClient.post<ProductCreatePayload, ProductDetail>("/products/", payload);
  },

  updateProduct(id: string, payload: ProductUpdatePayload) {
    return httpClient.patch<ProductUpdatePayload, ProductDetail>(`/products/${id}/`, payload);
  },

  toggleActive(id: string, isActive: boolean) {
    return httpClient.patch<{ is_active: boolean }, ProductDetail>(`/products/${id}/`, { is_active: isActive });
  },

  deleteProduct(id: string) {
    return httpClient.delete<void>(`/products/${id}/`);
  },
};
