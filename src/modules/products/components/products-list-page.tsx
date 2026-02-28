"use client";

import {
  Alert,
  Autocomplete,
  Avatar,
  CircularProgress,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { productsService } from "@/modules/products/services/products.service";
import { taxonomyService } from "@/modules/taxonomy/services/taxonomy.service";
import { formatCurrency, formatDateTime, sortProductsForDisplay } from "@/modules/products/utils";

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debouncedValue;
}

export function ProductsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<{ id: string; name: string } | null>(null);
  const [selectedType, setSelectedType] = useState<{ id: string; name: string } | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(searchParams.get("deleted") === "1");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const debouncedBrandSearch = useDebouncedValue(brandSearch.trim(), 250);
  const debouncedTypeSearch = useDebouncedValue(typeSearch.trim(), 250);

  const brandsQuery = useQuery({
    queryKey: ["brands", debouncedBrandSearch],
    queryFn: () => taxonomyService.searchBrands(debouncedBrandSearch),
  });

  const productTypesQuery = useQuery({
    queryKey: ["product-types", debouncedTypeSearch],
    queryFn: () => taxonomyService.searchProductTypes(debouncedTypeSearch),
  });

  const productsQuery = useQuery({
    queryKey: ["products", { q: debouncedSearch, page: 1, brand: selectedBrand?.id, product_type: selectedType?.id }],
    queryFn: () =>
      productsService.listProducts({
        q: debouncedSearch || undefined,
        page: 1,
        brand: selectedBrand?.id,
        product_type: selectedType?.id,
      }),
  });

  const productsWithStockCountQuery = useQuery({
    queryKey: ["products-with-stock-count", { q: debouncedSearch, brand: selectedBrand?.id, product_type: selectedType?.id }],
    queryFn: () =>
      productsService.listProducts({
        q: debouncedSearch || undefined,
        page: 1,
        brand: selectedBrand?.id,
        product_type: selectedType?.id,
        has_stock: true,
      }),
  });

  const sortedProducts = useMemo(() => sortProductsForDisplay(productsQuery.data?.results ?? []), [productsQuery.data]);
  const totalProducts = productsQuery.data?.count ?? 0;
  const totalProductsWithStock = productsWithStockCountQuery.data?.count ?? 0;
  const brandOptions = brandsQuery.data?.results ?? [];
  const typeOptions = productTypesQuery.data?.results ?? [];

  const errorMessage = useMemo(() => {
    if (!productsQuery.error) {
      return null;
    }

    if (productsQuery.error instanceof ApiError) {
      return productsQuery.error.detail;
    }

    return "No fue posible cargar los productos.";
  }, [productsQuery.error]);

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Productos</Typography>
      <Typography color="text.secondary">Consulta el inventario, filtra por nombre o SKU y entra al detalle de cada producto.</Typography>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  Productos encontrados
                </Typography>
                <Typography variant="h5">{totalProducts}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">
                  Productos con stock
                </Typography>
                <Typography variant="h5">{productsWithStockCountQuery.isLoading ? "..." : totalProductsWithStock}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <TextField
            label="Buscar producto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre o SKU"
            fullWidth
          />

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Autocomplete
              options={brandOptions}
              value={selectedBrand}
              onChange={(_event, value) => setSelectedBrand(value)}
              onInputChange={(_event, value, reason) => {
                if (reason === "input") {
                  setBrandSearch(value);
                }
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Filtrar por marca" placeholder="Todas" />}
              fullWidth
            />

            <Autocomplete
              options={typeOptions}
              value={selectedType}
              onChange={(_event, value) => setSelectedType(value)}
              onInputChange={(_event, value, reason) => {
                if (reason === "input") {
                  setTypeSearch(value);
                }
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Filtrar por tipo / categoria" placeholder="Todas" />}
              fullWidth
            />
          </Stack>

          {productsQuery.isLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={20} />
              <Typography color="text.secondary">Cargando productos...</Typography>
            </Stack>
          ) : null}

          {!productsQuery.isLoading && sortedProducts.length === 0 ? (
            <Alert severity="info">No hay productos para la búsqueda actual.</Alert>
          ) : null}

          {sortedProducts.length > 0 ? (
            <TableContainer>
              <Table sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Imagen</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Stock</TableCell>
                    <TableCell>Precio</TableCell>
                    <TableCell>Actualizado</TableCell>
                    <TableCell>Estatus</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      hover
                      onClick={() => router.push(`/products/${product.id}`)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <Avatar src={product.primary_image_url ?? undefined} alt={product.name}>
                          {product.name.slice(0, 1).toUpperCase()}
                        </Avatar>
                      </TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>{formatCurrency(product.default_price)}</TableCell>
                      <TableCell>{formatDateTime(product.updated_at)}</TableCell>
                      <TableCell>{product.is_active === false ? "Inactivo" : "Activo"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : null}
        </Stack>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => {
          setSnackbarOpen(false);
          router.replace("/products");
        }}
      >
        <Alert
          onClose={() => {
            setSnackbarOpen(false);
            router.replace("/products");
          }}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Producto borrado correctamente.
        </Alert>
      </Snackbar>
    </Stack>
  );
}
