"use client";

import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DetailPageHeader } from "@/components/common/detail-page-header";
import { MoneyInput } from "@/components/forms/money-input";
import { ApiError } from "@/lib/api/errors";
import type { ProductDetail, ProductUpdatePayload } from "@/lib/types/products";
import { ProductDeleteDialog } from "@/modules/products/components/product-delete-dialog";
import { productsService } from "@/modules/products/services/products.service";
import { taxonomyService } from "@/modules/taxonomy/services/taxonomy.service";
import {
  addTaxToAmount,
  applyApiFieldErrors,
  createProductFormState,
  formatCurrency,
  getAdditionalPriceKeys,
  getCostPriceFieldKey,
  getProfitMetrics,
  humanizeFieldName,
  removeTaxFromAmount,
  toProductUpdatePayload,
  type ProductFormErrors,
  type ProductFormState,
  validateProductForm,
} from "@/modules/products/utils";
import { useSessionStore } from "@/store/session-store";

interface ProductEditFormContentProps {
  product: ProductDetail;
}

function ProductEditFormContent({ product }: ProductEditFormContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductFormState>(() => createProductFormState(product));
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stockReasonOpen, setStockReasonOpen] = useState(false);
  const [stockReason, setStockReason] = useState("");
  const [stockReasonError, setStockReasonError] = useState<string | null>(null);
  const [brandSearch, setBrandSearch] = useState(product.brand_name ?? "");
  const [typeSearch, setTypeSearch] = useState(product.product_type_name ?? "");

  const costPriceKey = useMemo(() => getCostPriceFieldKey(product), [product]);
  const [costPriceWithTaxInput, setCostPriceWithTaxInput] = useState(() => addTaxToAmount(form.extraPrices[costPriceKey] ?? ""));
  const additionalPriceKeys = useMemo(() => getAdditionalPriceKeys(product, [costPriceKey]), [costPriceKey, product]);
  const profitMetrics = useMemo(
    () => getProfitMetrics(form.extraPrices[costPriceKey], form.default_price),
    [costPriceKey, form.default_price, form.extraPrices],
  );
  const canDelete = product.can_delete !== false;

  const brandsQuery = useQuery({
    queryKey: ["brands", brandSearch],
    queryFn: () => taxonomyService.searchBrands(brandSearch),
  });

  const productTypesQuery = useQuery({
    queryKey: ["product-types", typeSearch],
    queryFn: () => taxonomyService.searchProductTypes(typeSearch),
  });

  const brandOptions = useMemo(() => {
    const options = brandsQuery.data?.results ?? [];
    if (form.brand && form.brand_name && !options.some((option) => option.id === form.brand)) {
      return [{ id: form.brand, name: form.brand_name }, ...options];
    }
    return options;
  }, [brandsQuery.data, form.brand, form.brand_name]);

  const productTypeOptions = useMemo(() => {
    const options = productTypesQuery.data?.results ?? [];
    if (form.product_type && form.product_type_name && !options.some((option) => option.id === form.product_type)) {
      return [{ id: form.product_type, name: form.product_type_name }, ...options];
    }
    return options;
  }, [form.product_type, form.product_type_name, productTypesQuery.data]);

  const selectedBrandOption = useMemo(
    () => brandOptions.find((option) => option.id === form.brand) ?? null,
    [brandOptions, form.brand],
  );
  const selectedProductTypeOption = useMemo(
    () => productTypeOptions.find((option) => option.id === form.product_type) ?? null,
    [form.product_type, productTypeOptions],
  );

  const updateMutation = useMutation({
    mutationFn: (payload: ProductUpdatePayload) => productsService.updateProduct(product.id, payload),
    onSuccess: async (updatedProduct) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      setSuccessMessage("Producto actualizado correctamente.");
      router.push(`/products/${updatedProduct.id}?updated=1`);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setGeneralError(error.detail);
        setFormErrors((current) => applyApiFieldErrors(current, error.fields));
        const stockReasonFieldMessage = error.fields.stock_adjust_reason;
        if (stockReasonFieldMessage) {
          setStockReasonError(String(Array.isArray(stockReasonFieldMessage) ? stockReasonFieldMessage.join(" ") : stockReasonFieldMessage));
          setStockReasonOpen(true);
        }
        return;
      }

      setGeneralError("No fue posible guardar el producto.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => productsService.deleteProduct(product.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      setDeleteOpen(false);
      router.push("/products?deleted=1");
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setGeneralError(error.detail);
        return;
      }

      setGeneralError("No fue posible borrar el producto.");
    },
  });

  function updateField<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  }

  function updateExtraPrice(key: string, value: string) {
    setForm((current) => ({
      ...current,
      extraPrices: {
        ...current.extraPrices,
        [key]: value,
      },
    }));

    setFormErrors((current) => ({
      ...current,
      extraPrices: {
        ...(current.extraPrices ?? {}),
        [key]: "",
      },
    }));
  }

  async function handleSubmit() {
    setGeneralError(null);
    setStockReasonError(null);
    const nextErrors = validateProductForm(form);
    setFormErrors(nextErrors);

    const hasErrors =
      Boolean(nextErrors.sku) ||
      Boolean(nextErrors.name) ||
      Boolean(nextErrors.stock) ||
      Boolean(nextErrors.default_price) ||
      Boolean(nextErrors.primary_image_url) ||
      Boolean(nextErrors.extraPrices && Object.keys(nextErrors.extraPrices).length > 0);

    if (hasErrors) {
      return;
    }

    if (form.stock.trim() !== product.stock.trim()) {
      setStockReasonOpen(true);
      return;
    }

    await submitUpdate();
  }

  async function submitUpdate(reason?: string) {
    const payload = toProductUpdatePayload(form);

    if (form.stock.trim() !== product.stock.trim()) {
      payload.stock_adjust_reason = reason?.trim() ?? "";
    }

    await updateMutation.mutateAsync(payload);
  }

  async function handleConfirmStockReason() {
    if (!stockReason.trim()) {
      setStockReasonError("Debes capturar una razón para modificar el stock.");
      return;
    }

    setStockReasonError(null);
    setStockReasonOpen(false);
    await submitUpdate(stockReason);
  }

  return (
    <Stack spacing={3}>
      <DetailPageHeader
        breadcrumbs={[
          { label: "Productos", href: "/products" },
          { label: product.name, href: `/products/${product.id}` },
          { label: "Editar" },
        ]}
        backHref={`/products/${product.id}`}
        backLabel="Volver al detalle"
        title="Editar producto"
        description="Actualiza datos de inventario, precios y metadatos del producto."
        action={
          <Button
            variant="outlined"
            onClick={() => router.push(`/products/${product.id}`)}
            sx={{ borderColor: "rgba(148, 163, 184, 0.22)", color: "#e2e8f0" }}
          >
            Cancelar
          </Button>
        }
      />

      {generalError ? <Alert severity="error">{generalError}</Alert> : null}

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <TextField
            label="Nombre"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            error={Boolean(formErrors.name)}
            helperText={formErrors.name ?? " "}
            fullWidth
          />
          <TextField
            label="SKU"
            value={form.sku}
            onChange={(event) => updateField("sku", event.target.value)}
            error={Boolean(formErrors.sku)}
            helperText={formErrors.sku ?? " "}
            fullWidth
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Autocomplete
              options={brandOptions}
              value={selectedBrandOption}
              onChange={(_event, value) => {
                updateField("brand", value?.id ?? null);
                updateField("brand_name", value?.name ?? "");
              }}
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
                  label="Marca"
                  error={Boolean(formErrors.brand)}
                  helperText={formErrors.brand ?? " "}
                />
              )}
              fullWidth
            />
            <Autocomplete
              options={productTypeOptions}
              value={selectedProductTypeOption}
              onChange={(_event, value) => {
                updateField("product_type", value?.id ?? null);
                updateField("product_type_name", value?.name ?? "");
              }}
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
                  label="Categoria / tipo de producto"
                  error={Boolean(formErrors.product_type)}
                  helperText={formErrors.product_type ?? " "}
                />
              )}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              label="Stock"
              type="number"
              value={form.stock}
              onChange={(event) => updateField("stock", event.target.value)}
              error={Boolean(formErrors.stock)}
              helperText={formErrors.stock ?? " "}
              fullWidth
            />
            <MoneyInput
              label="Precio venta público"
              value={form.default_price}
              onChange={(value) => updateField("default_price", value)}
              error={Boolean(formErrors.default_price)}
              helperText={formErrors.default_price ?? " "}
              fullWidth
            />
          </Stack>

          <MoneyInput
            label="Precio de compra + IVA 16%"
            value={costPriceWithTaxInput}
            onChange={(value) => {
              setCostPriceWithTaxInput(value);
              updateExtraPrice(costPriceKey, removeTaxFromAmount(value));
            }}
            error={Boolean(formErrors.extraPrices?.[costPriceKey])}
            helperText={formErrors.extraPrices?.[costPriceKey] || " "}
            fullWidth
          />

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={0.75}>
              <Typography variant="subtitle2">Utilidad</Typography>
              <Typography>
                Precio compra + IVA 16%: {profitMetrics.costPriceWithTax === null ? "-" : formatCurrency(profitMetrics.costPriceWithTax)}
              </Typography>
              <Typography>Precio venta público: {profitMetrics.salePrice === null ? "-" : formatCurrency(profitMetrics.salePrice)}</Typography>
              <Typography>Utilidad en pesos: {profitMetrics.profitAmount === null ? "-" : formatCurrency(profitMetrics.profitAmount)}</Typography>
              <Typography>
                Utilidad %: {profitMetrics.profitPercentage === null ? "-" : `${profitMetrics.profitPercentage.toFixed(2)}%`}
              </Typography>
            </Stack>
          </Paper>

          {additionalPriceKeys.map((key) => (
            <MoneyInput
              key={key}
              label={humanizeFieldName(key)}
              value={form.extraPrices[key] ?? ""}
              onChange={(value) => updateExtraPrice(key, value)}
              error={Boolean(formErrors.extraPrices?.[key])}
              helperText={formErrors.extraPrices?.[key] || " "}
              fullWidth
            />
          ))}

          <TextField
            label="URL de imagen principal"
            value={form.primary_image_url}
            onChange={(event) => updateField("primary_image_url", event.target.value)}
            error={Boolean(formErrors.primary_image_url)}
            helperText={formErrors.primary_image_url ?? " "}
            fullWidth
          />

          <Button variant="contained" onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" color="error">
            Zona de borrado
          </Typography>
          <Typography color="text.secondary">
            Usa esta acción solo si el producto debe salir del catálogo operativo. El historial de compras y facturas debe permanecer intacto.
          </Typography>
          <Button color="error" variant="outlined" onClick={() => setDeleteOpen(true)} disabled={!canDelete || deleteMutation.isPending}>
            Borrar producto
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={2500}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" variant="filled" sx={{ width: "100%" }}>
          {successMessage ?? ""}
        </Alert>
      </Snackbar>

      <ProductDeleteDialog
        open={deleteOpen}
        productName={product.name}
        loading={deleteMutation.isPending}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          void deleteMutation.mutateAsync();
        }}
      />

      <Dialog open={stockReasonOpen} onClose={updateMutation.isPending ? undefined : () => setStockReasonOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar cambio de stock</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {`Vas a cambiar el stock de ${product.stock} a ${form.stock}. Captura la razón para registrar el movimiento de inventario.`}
          </DialogContentText>
          <TextField
            label="Razón del ajuste"
            value={stockReason}
            onChange={(event) => {
              setStockReason(event.target.value);
              setStockReasonError(null);
            }}
            error={Boolean(stockReasonError)}
            helperText={stockReasonError ?? " "}
            fullWidth
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockReasonOpen(false)} disabled={updateMutation.isPending}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={() => void handleConfirmStockReason()} disabled={updateMutation.isPending}>
            Confirmar y guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSessionStore();
  const productId = params.id ?? "";

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => productsService.getProduct(productId),
    enabled: Boolean(productId),
  });

  const canEdit = session.role === "ADMIN";

  if (!canEdit) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">No tienes permiso para editar productos.</Alert>
        <Button variant="outlined" onClick={() => router.push(`/products/${productId}`)}>
          Volver al detalle
        </Button>
      </Stack>
    );
  }

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
        <Alert severity="error">No fue posible cargar el producto.</Alert>
        <Button variant="outlined" onClick={() => router.push("/products")}>
          Volver a productos
        </Button>
      </Stack>
    );
  }

  return <ProductEditFormContent key={productQuery.data.id} product={productQuery.data} />;
}
