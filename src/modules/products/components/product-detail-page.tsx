"use client";

import { Alert, Avatar, Button, Chip, CircularProgress, Paper, Snackbar, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { ProductMovementsTable } from "@/modules/products/components/product-movements-table";
import { productsService } from "@/modules/products/services/products.service";
import {
  formatCurrency,
  formatDateTime,
  getAdditionalPriceKeys,
  getCostPriceFieldKey,
  getProfitMetrics,
  humanizeFieldName,
} from "@/modules/products/utils";
import { useSessionStore } from "@/store/session-store";

export function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = params.id ?? "";
  const [snackbarOpen, setSnackbarOpen] = useState(searchParams.get("updated") === "1");
  const { session } = useSessionStore();

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => productsService.getProduct(productId),
    enabled: Boolean(productId),
  });

  const errorMessage = useMemo(() => {
    if (!productQuery.error) {
      return null;
    }

    if (productQuery.error instanceof ApiError && productQuery.error.status === 404) {
      return "El producto ya no está disponible.";
    }

    if (productQuery.error instanceof ApiError) {
      return productQuery.error.detail;
    }

    return "No fue posible cargar el producto.";
  }, [productQuery.error]);

  const costPriceKey = useMemo(() => getCostPriceFieldKey(productQuery.data), [productQuery.data]);
  const additionalPriceKeys = useMemo(() => getAdditionalPriceKeys(productQuery.data, [costPriceKey]), [costPriceKey, productQuery.data]);

  if (productQuery.isLoading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={20} />
        <Typography>Cargando producto...</Typography>
      </Stack>
    );
  }

  if (!productQuery.data) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{errorMessage ?? "No fue posible cargar el producto."}</Alert>
        <Button variant="outlined" onClick={() => router.push("/products")}>
          Volver a productos
        </Button>
      </Stack>
    );
  }

  const product = productQuery.data;
  const isAdmin = session.role === "ADMIN";
  const profitMetrics = getProfitMetrics(product[costPriceKey] as string | null | undefined, product.default_price);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
        <div>
          <Typography variant="h4">{product.name}</Typography>
          <Typography color="text.secondary">Detalle del producto</Typography>
        </div>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => router.push("/products")}>
            Volver
          </Button>
          {isAdmin ? (
            <Button component={Link} href={`/products/${product.id}/edit`} variant="contained">
              Editar
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
            <Avatar src={product.primary_image_url ?? undefined} alt={product.name} sx={{ width: 88, height: 88 }}>
              {product.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <Stack spacing={0.5}>
              <Typography variant="h6">{product.name}</Typography>
              <Typography color="text.secondary">SKU: {product.sku}</Typography>
              <Typography>Marca: {product.brand_name || "-"}</Typography>
              <Typography>Categoria: {product.product_type_name || "-"}</Typography>
              <Typography>Stock: {product.stock}</Typography>
              <Typography>
                Precio compra + IVA 16%: {profitMetrics.costPriceWithTax === null ? "-" : formatCurrency(profitMetrics.costPriceWithTax)}
              </Typography>
              <Typography>Precio venta público: {formatCurrency(product.default_price)}</Typography>
              <Typography>Utilidad en pesos: {profitMetrics.profitAmount === null ? "-" : formatCurrency(profitMetrics.profitAmount)}</Typography>
              <Typography>
                Utilidad %: {profitMetrics.profitPercentage === null ? "-" : `${profitMetrics.profitPercentage.toFixed(2)}%`}
              </Typography>
              <Chip
                label={product.is_active === false ? "Inactivo" : "Activo"}
                size="small"
                color={product.is_active === false ? "default" : "success"}
                sx={{ width: "fit-content" }}
              />
            </Stack>
          </Stack>

          {additionalPriceKeys.length > 0 ? (
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">Precios adicionales</Typography>
              {additionalPriceKeys.map((key) => (
                <Typography key={key}>
                  {humanizeFieldName(key)}: {formatCurrency(product[key] as string | null)}
                </Typography>
              ))}
            </Stack>
          ) : null}

          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Metadatos</Typography>
            <Typography>ID: {product.id}</Typography>
            <Typography>Creado: {formatDateTime(product.created_at)}</Typography>
            <Typography>Actualizado: {formatDateTime(product.updated_at)}</Typography>
            <Typography>
              Imagen principal: {product.primary_image_url ? product.primary_image_url : "No disponible"}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <ProductMovementsTable key={product.id} productId={product.id} />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => {
          setSnackbarOpen(false);
          router.replace(`/products/${product.id}`);
        }}
      >
        <Alert
          onClose={() => {
            setSnackbarOpen(false);
            router.replace(`/products/${product.id}`);
          }}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Producto actualizado correctamente.
        </Alert>
      </Snackbar>
    </Stack>
  );
}
