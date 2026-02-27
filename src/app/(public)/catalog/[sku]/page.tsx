"use client";

import { Alert, Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { catalogService } from "@/modules/catalog/services/catalog.service";
export default function CatalogDetailPage() {
  const params = useParams<{ sku: string }>();
  const sku = params.sku ?? "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["catalog-detail", sku],
    queryFn: () => catalogService.getCatalogBySku(sku),
    enabled: Boolean(sku),
    staleTime: 60_000,
  });

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", py: 4, px: 2 }}>
      <Stack spacing={2}>
        <Typography component={Link} href="/catalog" color="primary.main">
          ← Volver al catálogo
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
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                {data.name}
              </Typography>
              <Typography color="text.secondary">SKU: {data.sku}</Typography>
              <Typography variant="h5">${Number(data.default_price).toFixed(2)}</Typography>
              <Typography color="text.secondary">Actualizado: {new Date(data.updated_at).toLocaleString()}</Typography>
              <Typography color="text.secondary">
                Imagen principal: {data.primary_image_url ? data.primary_image_url : "No disponible"}
              </Typography>
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </Box>
  );
}
