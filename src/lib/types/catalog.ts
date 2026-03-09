import type { ProductImageItem } from "@/lib/types/products";

export interface PublicCatalogProduct {
  id: string;
  sku: string;
  name: string;
  default_price: string;
  primary_image_id: string | null;
  images: ProductImageItem[];
  updated_at: string;
}
