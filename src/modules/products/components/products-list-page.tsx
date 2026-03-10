"use client";

import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
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
import { reportsService } from "@/modules/reports/services/reports.service";
import { taxonomyService } from "@/modules/taxonomy/services/taxonomy.service";
import { formatCurrency, formatDateTime, sortProductsForDisplay } from "@/modules/products/utils";
import { getPrimaryImageUrl } from "@/modules/products/image-upload";
import { useSessionStore } from "@/store/session-store";

const IVA_RATE = 0.16;

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
  const { session } = useSessionStore();
  const [snackbarOpen, setSnackbarOpen] = useState(searchParams.get("deleted") === "1");
  const [createdSnackbarOpen, setCreatedSnackbarOpen] = useState(searchParams.get("created") === "1");
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
        include_inactive: true,
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
        include_inactive: true,
      }),
  });

  const isAdmin = session.role === "ADMIN";

  const inventoryMetricsQuery = useQuery({
    queryKey: ["inventory-metrics"],
    queryFn: () => reportsService.getMetrics({}),
    enabled: isAdmin,
    select: (data) => {
      const costValue = Number(data.inventory_snapshot.cost_value);
      const costValueWithTax = costValue * (1 + IVA_RATE);
      const retailValue = Number(data.inventory_snapshot.retail_value);
      const potentialProfit = retailValue - costValueWithTax;
      const totalUnits = Number(data.inventory_snapshot.total_units);
      const marginPct = retailValue > 0 ? (potentialProfit / retailValue) * 100 : 0;
      return { costValueWithTax, retailValue, potentialProfit, totalUnits, marginPct };
    },
  });

  const sortedProducts = useMemo(() => sortProductsForDisplay(productsQuery.data?.results ?? []), [productsQuery.data]);
  const totalProducts = productsQuery.data?.count ?? 0;
  const totalProductsWithStock = productsWithStockCountQuery.data?.count ?? 0;
  const productsWithoutStock = Math.max(totalProducts - totalProductsWithStock, 0);
  const inactiveProducts = sortedProducts.filter((product) => product.is_active === false).length;
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
      <Paper
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 4,
          color: "#e2e8f0",
          background:
            "linear-gradient(135deg, #0f172a 0%, #13213c 45%, #16324f 100%)",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          boxShadow: "0 28px 60px rgba(15, 23, 42, 0.22)",
        }}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "rgba(191, 219, 254, 0.9)", letterSpacing: "0.18em", fontWeight: 800 }}
              >
                Inventario operativo
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.03em" }}>
                Productos
              </Typography>
              <Typography sx={{ color: "rgba(226, 232, 240, 0.78)", maxWidth: 760 }}>
                Consulta el inventario, detecta productos sin stock y entra al detalle de cada producto con una vista más clara para operación diaria.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              {isAdmin && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => router.push("/products/new")}
                  sx={{ fontWeight: 800 }}
                >
                  + Nuevo producto
                </Button>
              )}
              <Chip
                label={`${totalProductsWithStock} con stock`}
                sx={{
                  fontWeight: 800,
                  color: "#d1fae5",
                  backgroundColor: "rgba(16, 185, 129, 0.16)",
                  border: "1px solid rgba(16, 185, 129, 0.24)",
                }}
              />
              <Chip
                label={`${productsWithoutStock} sin stock`}
                sx={{
                  fontWeight: 800,
                  color: "#fef3c7",
                  backgroundColor: "rgba(245, 158, 11, 0.16)",
                  border: "1px solid rgba(245, 158, 11, 0.22)",
                }}
              />
              <Chip
                label={`${inactiveProducts} inactivos`}
                sx={{
                  fontWeight: 800,
                  color: "#e2e8f0",
                  backgroundColor: "rgba(148, 163, 184, 0.14)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                }}
              />
            </Stack>
          </Stack>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                }}
              >
                <Typography variant="overline" sx={{ color: "rgba(191, 219, 254, 0.8)", fontWeight: 800 }}>
                  Productos encontrados
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {totalProducts}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                }}
              >
                <Typography variant="overline" sx={{ color: "rgba(191, 219, 254, 0.8)", fontWeight: 800 }}>
                  Disponibles
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {productsWithStockCountQuery.isLoading ? "..." : totalProductsWithStock}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                }}
              >
                <Typography variant="overline" sx={{ color: "rgba(191, 219, 254, 0.8)", fontWeight: 800 }}>
                  Sin stock
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {productsWithStockCountQuery.isLoading ? "..." : productsWithoutStock}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {isAdmin && inventoryMetricsQuery.data && (
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
                    Piezas totales
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>
                    {inventoryMetricsQuery.data.totalUnits.toLocaleString("es-MX")}
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
                    Costo total + IVA
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>
                    {formatCurrency(inventoryMetricsQuery.data.costValueWithTax)}
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
                    Valor venta total
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>
                    {formatCurrency(inventoryMetricsQuery.data.retailValue)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    backgroundColor: "rgba(16, 185, 129, 0.06)",
                    border: "1px solid rgba(16, 185, 129, 0.18)",
                  }}
                >
                  <Typography variant="overline" sx={{ color: "rgba(16, 185, 129, 0.9)", fontWeight: 800 }}>
                    Utilidad potencial
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: "#6ee7b7" }}>
                    {formatCurrency(inventoryMetricsQuery.data.potentialProfit)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(16, 185, 129, 0.8)" }}>
                    {inventoryMetricsQuery.data.marginPct.toFixed(1)}% margen
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Stack>
      </Paper>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 4,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          background:
            "linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(17, 24, 39, 0.92) 100%)",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.2)",
        }}
      >
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#f8fafc" }}>
              Explorador de productos
            </Typography>
            <Typography sx={{ color: "rgba(226, 232, 240, 0.76)" }}>
              Filtra por nombre, SKU, marca o categoría. Haz clic en cualquier fila para entrar al detalle del producto.
            </Typography>
          </Stack>

          <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.16)" }} />

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
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filtrar por marca"
                  placeholder="Todas"
                />
              )}
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
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filtrar por tipo / categoria"
                  placeholder="Todas"
                />
              )}
              fullWidth
            />
          </Stack>

          {productsQuery.isLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={20} />
              <Typography sx={{ color: "rgba(226, 232, 240, 0.72)" }}>Cargando productos...</Typography>
            </Stack>
          ) : null}

          {!productsQuery.isLoading && sortedProducts.length === 0 ? (
            <Alert severity="info">No hay productos para la búsqueda actual.</Alert>
          ) : null}

          {sortedProducts.length > 0 ? (
            <TableContainer
              sx={{
                borderRadius: 3,
                border: "1px solid rgba(148, 163, 184, 0.16)",
                overflowX: "auto",
                background:
                  "linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, rgba(30, 41, 59, 0.34) 100%)",
                backdropFilter: "blur(6px)",
              }}
            >
              <Table sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        Imagen
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        SKU
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        Nombre
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        Stock
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        Precio
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        Actualizado
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        Estatus
                      </Typography>
                    </TableCell>
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
                        <Avatar
                          variant="rounded"
                          src={getPrimaryImageUrl(product.images, product.primary_image_id) ?? undefined}
                          alt={product.name}
                          sx={{
                            width: 64,
                            height: 64,
                            fontWeight: 900,
                            fontSize: "1.25rem",
                            borderRadius: 2,
                            bgcolor: "rgba(29, 78, 216, 0.12)",
                            color: "#1d4ed8",
                            border: "1px solid rgba(29, 78, 216, 0.18)",
                          }}
                        >
                          {product.name.slice(0, 1).toUpperCase()}
                        </Avatar>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography sx={{ fontWeight: 800, color: "#f8fafc" }}>{product.sku}</Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 240 }}>
                        <Typography sx={{ fontWeight: 800, color: "#f8fafc" }}>{product.name}</Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          label={`${product.stock}`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            color: Number(product.stock) > 0 ? "#dcfce7" : "#fef3c7",
                            backgroundColor: Number(product.stock) > 0 ? "rgba(34, 197, 94, 0.14)" : "rgba(245, 158, 11, 0.14)",
                            border: `1px solid ${
                              Number(product.stock) > 0 ? "rgba(34, 197, 94, 0.18)" : "rgba(245, 158, 11, 0.2)"
                            }`,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography sx={{ fontWeight: 900, color: "#f8fafc" }}>{formatCurrency(product.default_price)}</Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Typography sx={{ fontWeight: 700, color: "rgba(226, 232, 240, 0.8)" }}>{formatDateTime(product.updated_at)}</Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          label={product.is_active === false ? "Inactivo" : "Activo"}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            color: product.is_active === false ? "#fecaca" : "#dbeafe",
                            backgroundColor:
                              product.is_active === false ? "rgba(239, 68, 68, 0.14)" : "rgba(37, 99, 235, 0.14)",
                            border: `1px solid ${
                              product.is_active === false ? "rgba(239, 68, 68, 0.18)" : "rgba(37, 99, 235, 0.18)"
                            }`,
                          }}
                        />
                      </TableCell>
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

      <Snackbar
        open={createdSnackbarOpen}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => {
          setCreatedSnackbarOpen(false);
          router.replace("/products");
        }}
      >
        <Alert
          onClose={() => {
            setCreatedSnackbarOpen(false);
            router.replace("/products");
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
