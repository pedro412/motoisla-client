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
import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DetailPageHeader } from "@/components/common/detail-page-header";
import { MoneyInput } from "@/components/forms/money-input";
import { ApiError } from "@/lib/api/errors";
import type { ProductCreatePayload, ProductDetail, ProductUpdatePayload } from "@/lib/types/products";
import { ProductDeleteDialog } from "@/modules/products/components/product-delete-dialog";
import { productsService } from "@/modules/products/services/products.service";
import { taxonomyService } from "@/modules/taxonomy/services/taxonomy.service";
import {
  addTaxToAmount,
  applyApiFieldErrors,
  createEmptyProductFormState,
  createProductFormState,
  formatCurrency,
  getAdditionalPriceKeys,
  getCostPriceFieldKey,
  getProfitMetrics,
  humanizeFieldName,
  removeTaxFromAmount,
  toProductCreatePayload,
  toProductUpdatePayload,
  type ProductFormErrors,
  type ProductFormState,
  validateProductForm,
} from "@/modules/products/utils";
import { useSessionStore } from "@/store/session-store";

const CREATE_PREFIX = "__create__::";

function getOptionsWithCreate(options: string[], input: string): string[] {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) {
    return options;
  }
  if (options.some((option) => option.toUpperCase() === trimmed)) {
    return options;
  }
  return [...options, `${CREATE_PREFIX}${trimmed}`];
}

function displayOption(option: string): string {
  if (option.startsWith(CREATE_PREFIX)) {
    return `Crear "${option.replace(CREATE_PREFIX, "")}"`;
  }
  return option;
}

interface ProductEditFormContentProps {
  product?: ProductDetail;
  mode: "create" | "edit";
}

function ProductEditFormContent({ product, mode }: ProductEditFormContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isCreate = mode === "create";
  const [form, setForm] = useState<ProductFormState>(() =>
    product ? createProductFormState(product) : createEmptyProductFormState(),
  );
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleActiveOpen, setToggleActiveOpen] = useState(false);
  const [stockReasonOpen, setStockReasonOpen] = useState(false);
  const [stockReason, setStockReason] = useState("");
  const [stockReasonError, setStockReasonError] = useState<string | null>(null);
  const [brandSearch, setBrandSearch] = useState(product?.brand_name ?? "");
  const [typeSearch, setTypeSearch] = useState(product?.product_type_name ?? "");

  const costPriceKey = useMemo(() => (isCreate ? "cost_price" : getCostPriceFieldKey(product)), [isCreate, product]);
  const [costPriceWithTaxInput, setCostPriceWithTaxInput] = useState(() => addTaxToAmount(form.extraPrices[costPriceKey] ?? ""));
  const additionalPriceKeys = useMemo(() => (isCreate ? [] : getAdditionalPriceKeys(product, [costPriceKey])), [isCreate, costPriceKey, product]);
  const profitMetrics = useMemo(
    () => getProfitMetrics(form.extraPrices[costPriceKey], form.default_price),
    [costPriceKey, form.default_price, form.extraPrices],
  );
  const canDelete = !isCreate && product?.can_delete !== false;

  const brandsQuery = useQuery({
    queryKey: ["brands", brandSearch],
    queryFn: () => taxonomyService.searchBrands(brandSearch),
  });

  const productTypesQuery = useQuery({
    queryKey: ["product-types", typeSearch],
    queryFn: () => taxonomyService.searchProductTypes(typeSearch),
  });

  const brandNames = useMemo(() => (brandsQuery.data?.results ?? []).map((b) => b.name), [brandsQuery.data]);
  const brandResults = brandsQuery.data?.results ?? [];
  const typeNames = useMemo(() => (productTypesQuery.data?.results ?? []).map((t) => t.name), [productTypesQuery.data]);
  const typeResults = productTypesQuery.data?.results ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: ProductCreatePayload) => productsService.createProduct(payload),
    onSuccess: async (createdProduct) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push(`/products/${createdProduct.id}?created=1`);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setGeneralError(error.detail);
        setFormErrors((current) => applyApiFieldErrors(current, error.fields));
        return;
      }

      setGeneralError("No fue posible crear el producto.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ProductUpdatePayload) => productsService.updateProduct(product!.id, payload),
    onSuccess: async (updatedProduct) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", product!.id] });
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
    mutationFn: () => productsService.deleteProduct(product!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", product!.id] });
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

  const toggleActiveMutation = useMutation({
    mutationFn: () => productsService.toggleActive(product!.id, !product!.is_active),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", product!.id] });
      setToggleActiveOpen(false);
      const action = product!.is_active ? "desactivado" : "activado";
      router.push(`/products/${product!.id}?updated=1`);
      setSuccessMessage(`Producto ${action} correctamente.`);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        setGeneralError(error.detail);
        return;
      }
      setGeneralError("No fue posible cambiar el estado del producto.");
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

  const handleCreateBrand = useCallback(async (name: string) => {
    setGeneralError(null);
    try {
      const created = await taxonomyService.createBrand(name);
      setBrandSearch(created.name);
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
      updateField("brand", created.id);
      updateField("brand_name", created.name);
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralError(error.detail);
      } else {
        setGeneralError("No fue posible crear la marca.");
      }
    }
  }, [queryClient]);

  const handleCreateProductType = useCallback(async (name: string) => {
    setGeneralError(null);
    try {
      const created = await taxonomyService.createProductType(name);
      setTypeSearch(created.name);
      await queryClient.invalidateQueries({ queryKey: ["product-types"] });
      updateField("product_type", created.id);
      updateField("product_type_name", created.name);
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralError(error.detail);
      } else {
        setGeneralError("No fue posible crear el tipo de producto.");
      }
    }
  }, [queryClient]);

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

    if (isCreate) {
      await createMutation.mutateAsync(toProductCreatePayload(form));
      return;
    }

    if (form.stock.trim() !== product!.stock.trim()) {
      setStockReasonOpen(true);
      return;
    }

    await submitUpdate();
  }

  async function submitUpdate(reason?: string) {
    const payload = toProductUpdatePayload(form);

    if (form.stock.trim() !== product!.stock.trim()) {
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

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Stack spacing={3}>
      <DetailPageHeader
        breadcrumbs={
          isCreate
            ? [{ label: "Productos", href: "/products" }, { label: "Nuevo producto" }]
            : [
                { label: "Productos", href: "/products" },
                { label: product!.name, href: `/products/${product!.id}` },
                { label: "Editar" },
              ]
        }
        backHref={isCreate ? "/products" : `/products/${product!.id}`}
        backLabel={isCreate ? "Volver a productos" : "Volver al detalle"}
        title={isCreate ? "Nuevo producto" : "Editar producto"}
        description={
          isCreate
            ? "Registra un nuevo producto en el catálogo con su inventario inicial y precios."
            : "Actualiza datos de inventario, precios y metadatos del producto."
        }
        action={
          <Button
            variant="outlined"
            onClick={() => router.push(isCreate ? "/products" : `/products/${product!.id}`)}
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
              freeSolo
              options={getOptionsWithCreate(brandNames, form.brand_name)}
              value={form.brand_name}
              onInputChange={(_event, value, reason) => {
                if (reason === "input") {
                  const upper = value.toUpperCase();
                  updateField("brand_name", upper);
                  updateField("brand", null);
                  setBrandSearch(value);
                }
              }}
              onChange={async (_event, value) => {
                if (!value) {
                  updateField("brand", null);
                  updateField("brand_name", "");
                  return;
                }
                if (typeof value === "string" && value.startsWith(CREATE_PREFIX)) {
                  await handleCreateBrand(value.replace(CREATE_PREFIX, ""));
                  return;
                }
                const matched = brandResults.find((b) => b.name === value);
                updateField("brand_name", typeof value === "string" ? value : "");
                updateField("brand", matched?.id ?? null);
              }}
              getOptionLabel={displayOption}
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
              freeSolo
              options={getOptionsWithCreate(typeNames, form.product_type_name)}
              value={form.product_type_name}
              onInputChange={(_event, value, reason) => {
                if (reason === "input") {
                  const upper = value.toUpperCase();
                  updateField("product_type_name", upper);
                  updateField("product_type", null);
                  setTypeSearch(value);
                }
              }}
              onChange={async (_event, value) => {
                if (!value) {
                  updateField("product_type", null);
                  updateField("product_type_name", "");
                  return;
                }
                if (typeof value === "string" && value.startsWith(CREATE_PREFIX)) {
                  await handleCreateProductType(value.replace(CREATE_PREFIX, ""));
                  return;
                }
                const matched = typeResults.find((t) => t.name === value);
                updateField("product_type_name", typeof value === "string" ? value : "");
                updateField("product_type", matched?.id ?? null);
              }}
              getOptionLabel={displayOption}
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

          <Button variant="contained" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Guardando..." : isCreate ? "Crear producto" : "Guardar cambios"}
          </Button>
        </Stack>
      </Paper>

      {!isCreate && product && (
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={2.5}>
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ color: product.is_active === false ? "#6ee7b7" : "#fbbf24" }}>
                {product.is_active === false ? "Producto inactivo" : "Desactivar producto"}
              </Typography>
              <Typography color="text.secondary">
                {product.is_active === false
                  ? "Este producto está inactivo. No aparece en el POS ni en el catálogo público. Puedes reactivarlo en cualquier momento."
                  : "Desactivar oculta el producto del POS y del catálogo público sin borrar historial de compras, ventas o movimientos de inventario."}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setToggleActiveOpen(true)}
                disabled={toggleActiveMutation.isPending}
                sx={{
                  alignSelf: "flex-start",
                  borderColor: product.is_active === false ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)",
                  color: product.is_active === false ? "#6ee7b7" : "#fbbf24",
                }}
              >
                {product.is_active === false ? "Reactivar producto" : "Desactivar producto"}
              </Button>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="h6" color="error">
                Zona de borrado
              </Typography>
              <Typography color="text.secondary">
                Usa esta acción solo si el producto debe salir del catálogo operativo. El historial de compras y facturas debe permanecer intacto.
              </Typography>
              <Button
                color="error"
                variant="outlined"
                onClick={() => setDeleteOpen(true)}
                disabled={!canDelete || deleteMutation.isPending}
                sx={{ alignSelf: "flex-start" }}
              >
                Borrar producto
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

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

      {!isCreate && product && (
        <>
          <Dialog
            open={toggleActiveOpen}
            onClose={toggleActiveMutation.isPending ? undefined : () => setToggleActiveOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {product.is_active === false ? "Reactivar producto" : "Desactivar producto"}
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                {product.is_active === false
                  ? `¿Confirmas que deseas reactivar "${product.name}"? Volverá a aparecer en el POS y catálogo público.`
                  : `¿Confirmas que deseas desactivar "${product.name}"? Ya no aparecerá en el POS ni en el catálogo público. El historial de ventas, compras y movimientos se conserva.`}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setToggleActiveOpen(false)} disabled={toggleActiveMutation.isPending}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={() => void toggleActiveMutation.mutateAsync()}
                disabled={toggleActiveMutation.isPending}
                color={product.is_active === false ? "primary" : "warning"}
              >
                {toggleActiveMutation.isPending ? "Procesando..." : product.is_active === false ? "Reactivar" : "Desactivar"}
              </Button>
            </DialogActions>
          </Dialog>

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
        </>
      )}
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

  return <ProductEditFormContent key={productQuery.data.id} product={productQuery.data} mode="edit" />;
}

export function ProductCreatePage() {
  const router = useRouter();
  const { session } = useSessionStore();

  if (session.role !== "ADMIN") {
    return (
      <Stack spacing={2}>
        <Alert severity="error">No tienes permiso para crear productos.</Alert>
        <Button variant="outlined" onClick={() => router.push("/products")}>
          Volver a productos
        </Button>
      </Stack>
    );
  }

  return <ProductEditFormContent mode="create" />;
}
