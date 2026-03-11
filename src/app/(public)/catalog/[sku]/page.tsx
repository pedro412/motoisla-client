"use client";

import { Alert, Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { catalogService } from "@/modules/catalog/services/catalog.service";
import { getPrimaryImageUrl } from "@/modules/products/image-upload";

export default function CatalogDetailPage() {
  const params = useParams<{ sku: string }>();
  const sku = params.sku ?? "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["catalog-detail", sku],
    queryFn: () => catalogService.getCatalogBySku(sku),
    enabled: Boolean(sku),
    staleTime: 60_000,
  });

  const imageUrl = data ? getPrimaryImageUrl(data.images, data.primary_image_id, false) : null;

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", py: 4, px: 2 }}>
      <Stack spacing={2}>
        <Typography component={Link} href="/catalog" color="primary.main">
          ← Volver al catalogo
        </Typography>

        {isLoading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : null}

        {isError ? (
          <Alert severity="error">{(error as Error)?.message ?? "No fue posible cargar el detalle."}</Alert>
        ) : null}

        {data ? (
          <Paper sx={{ p: 3 }}>
            <Stack spacing={1.5}>
              <Typography variant="h4" fontWeight={700}>
                {data.name}
              </Typography>
              <Typography color="text.secondary">SKU: {data.sku}</Typography>
              <Typography variant="h5">${Number(data.default_price).toFixed(2)}</Typography>
              <Typography color="text.secondary">Actualizado: {new Date(data.updated_at).toLocaleString()}</Typography>
              <Box
                component="img"
                src={imageUrl ?? undefined}
                alt={data.name}
                sx={{
                  width: "100%",
                  maxHeight: 360,
                  objectFit: "contain",
                  borderRadius: 2,
                  backgroundColor: "rgba(161, 161, 170, 0.08)",
                  border: "1px solid rgba(161, 161, 170, 0.16)",
                }}
              />
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </Box>
  );
}
