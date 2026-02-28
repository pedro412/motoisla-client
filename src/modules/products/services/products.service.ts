import { httpClient } from "@/lib/api/http-client";
import type { ProductDetail, ProductListResponse, ProductUpdatePayload } from "@/lib/types/products";

export const productsService = {
  listProducts(params: { q?: string; page?: number; brand?: string; product_type?: string; has_stock?: boolean }) {
    return httpClient.get<ProductListResponse>("/products/", {
      q: params.q,
      page: params.page,
      brand: params.brand,
      product_type: params.product_type,
      has_stock: params.has_stock === undefined ? undefined : params.has_stock ? "true" : "false",
    });
  },

  getProduct(id: string) {
    return httpClient.get<ProductDetail>(`/products/${id}/`);
  },

  updateProduct(id: string, payload: ProductUpdatePayload) {
    return httpClient.patch<ProductUpdatePayload, ProductDetail>(`/products/${id}/`, payload);
  },

  deleteProduct(id: string) {
    return httpClient.delete<void>(`/products/${id}/`);
  },
};
