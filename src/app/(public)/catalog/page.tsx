"use client";

import {
  Alert,
  Box,
  CircularProgress,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { catalogService } from "@/modules/catalog/services/catalog.service";
import { getPrimaryImageUrl } from "@/modules/products/image-upload";

const pageSize = 20;

export default function CatalogPage() {
  const [queryText, setQueryText] = useState("");
  const [page, setPage] = useState(1);

  const queryKey = useMemo(() => ["public-catalog", queryText, page], [queryText, page]);
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => catalogService.searchCatalog({ q: queryText || undefined, page }),
    staleTime: 60_000,
  });

  const totalPages = useMemo(() => {
    if (!data) {
      return 1;
    }
    return Math.max(1, Math.ceil(data.count / pageSize));
  }, [data]);

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", py: 4, px: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          Catalogo Publico
        </Typography>
        <TextField
          label="Buscar por nombre o SKU"
          value={queryText}
          onChange={(event) => {
            setQueryText(event.target.value);
            setPage(1);
          }}
          fullWidth
        />

        {isLoading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : null}

        {isError ? (
          <Alert severity="error">{(error as Error)?.message ?? "No fue posible cargar el catalogo."}</Alert>
        ) : null}

        {!isLoading && data && data.results.length === 0 ? (
          <Alert severity="info">No hay productos para la busqueda actual.</Alert>
        ) : null}

        {data?.results.map((item) => {
          const imageUrl = getPrimaryImageUrl(item.images, item.primary_image_id, true);

          return (
            <Paper key={item.id} sx={{ p: 2.5 }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
                <Stack direction="row" spacing={2}>
                  <Box
                    component="img"
                    src={imageUrl ?? undefined}
                    alt={item.name}
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: 2,
                      objectFit: "cover",
                      bgcolor: "rgba(148, 163, 184, 0.14)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                    }}
                  />
                  <Box>
                    <Typography variant="h6">{item.name}</Typography>
                    <Typography color="text.secondary">SKU: {item.sku}</Typography>
                  </Box>
                </Stack>
                <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={0.5}>
                  <Typography variant="h6">${Number(item.default_price).toFixed(2)}</Typography>
                  <Typography component={Link} href={`/catalog/${item.sku}`} color="primary.main">
                    Ver detalle
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          );
        })}

        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, nextPage) => setPage(nextPage)}
            color="primary"
          />
        </Box>
      </Stack>
    </Box>
  );
}
