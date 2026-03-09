"use client";

import { Alert, Avatar, Button, Chip, CircularProgress, Grid, Paper, Snackbar, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { DetailPageHeader } from "@/components/common/detail-page-header";
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
  const [createdSnackbarOpen, setCreatedSnackbarOpen] = useState(searchParams.get("created") === "1");
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
      <DetailPageHeader
        breadcrumbs={[
          { label: "Productos", href: "/products" },
          { label: product.name },
        ]}
        backHref="/products"
        title={product.name}
        description="Revisa precios, rentabilidad y trazabilidad de inventario desde una sola vista."
        action={
          isAdmin ? (
            <Button
              component={Link}
              href={`/products/${product.id}/edit`}
              variant="contained"
              sx={{
                backgroundColor: "#2563eb",
                "&:hover": {
                  backgroundColor: "#1d4ed8",
                },
              }}
            >
              Editar
            </Button>
          ) : null
        }
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(148, 163, 184, 0.14)",
              }}
            >
              <Typography variant="overline" sx={{ color: "rgba(191, 219, 254, 0.8)", fontWeight: 800 }}>
                Stock
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {product.stock}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(148, 163, 184, 0.14)",
              }}
            >
              <Typography variant="overline" sx={{ color: "rgba(191, 219, 254, 0.8)", fontWeight: 800 }}>
                Precio público
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {formatCurrency(product.default_price)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(148, 163, 184, 0.14)",
              }}
            >
              <Typography variant="overline" sx={{ color: "rgba(191, 219, 254, 0.8)", fontWeight: 800 }}>
                Utilidad
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {profitMetrics.profitAmount === null ? "-" : formatCurrency(profitMetrics.profitAmount)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(148, 163, 184, 0.14)",
              }}
            >
              <Typography variant="overline" sx={{ color: "rgba(191, 219, 254, 0.8)", fontWeight: 800 }}>
                Margen %
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {profitMetrics.profitPercentage === null ? "-" : `${profitMetrics.profitPercentage.toFixed(2)}%`}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </DetailPageHeader>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 4,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(17, 24, 39, 0.92) 100%)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.2)",
        }}
      >
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
            <Avatar
              src={product.primary_image_url ?? undefined}
              alt={product.name}
              sx={{
                width: 92,
                height: 92,
                fontWeight: 900,
                bgcolor: alpha("#1d4ed8", 0.14),
                color: "#bfdbfe",
                border: "1px solid rgba(96, 165, 250, 0.2)",
              }}
            >
              {product.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <Stack spacing={0.8}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#f8fafc" }}>
                {product.name}
              </Typography>
              <Typography sx={{ color: "rgba(226, 232, 240, 0.76)" }}>SKU: {product.sku}</Typography>
              <Typography sx={{ color: "#e2e8f0" }}>Marca: {product.brand_name || "-"}</Typography>
              <Typography sx={{ color: "#e2e8f0" }}>Categoria: {product.product_type_name || "-"}</Typography>
              <Typography sx={{ color: "#e2e8f0" }}>
                Precio compra + IVA 16%: {profitMetrics.costPriceWithTax === null ? "-" : formatCurrency(profitMetrics.costPriceWithTax)}
              </Typography>
              <Chip
                label={product.is_active === false ? "Inactivo" : "Activo"}
                size="small"
                sx={{
                  width: "fit-content",
                  fontWeight: 800,
                  color: product.is_active === false ? "#fecaca" : "#dcfce7",
                  backgroundColor:
                    product.is_active === false ? "rgba(239, 68, 68, 0.14)" : "rgba(34, 197, 94, 0.14)",
                  border: `1px solid ${
                    product.is_active === false ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.18)"
                  }`,
                }}
              />
            </Stack>
          </Stack>

          {additionalPriceKeys.length > 0 ? (
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(148, 163, 184, 0.14)",
              }}
            >
              <Stack spacing={0.75}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#f8fafc" }}>
                  Precios adicionales
                </Typography>
                {additionalPriceKeys.map((key) => (
                  <Typography key={key} sx={{ color: "#e2e8f0" }}>
                    {humanizeFieldName(key)}: {formatCurrency(product[key] as string | null)}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          ) : null}

          <Paper
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(148, 163, 184, 0.14)",
            }}
          >
            <Stack spacing={0.75}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#f8fafc" }}>
                Metadatos
              </Typography>
              <Typography sx={{ color: "#e2e8f0" }}>ID: {product.id}</Typography>
              <Typography sx={{ color: "#e2e8f0" }}>Creado: {formatDateTime(product.created_at)}</Typography>
              <Typography sx={{ color: "#e2e8f0" }}>Actualizado: {formatDateTime(product.updated_at)}</Typography>
              <Typography sx={{ color: "#e2e8f0" }}>
                Imagen principal: {product.primary_image_url ? product.primary_image_url : "No disponible"}
              </Typography>
            </Stack>
          </Paper>
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

      <Snackbar
        open={createdSnackbarOpen}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => {
          setCreatedSnackbarOpen(false);
          router.replace(`/products/${product.id}`);
        }}
      >
        <Alert
          onClose={() => {
            setCreatedSnackbarOpen(false);
            router.replace(`/products/${product.id}`);
          }}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Producto creado correctamente.
        </Alert>
      </Snackbar>
    </Stack>
  );
}
