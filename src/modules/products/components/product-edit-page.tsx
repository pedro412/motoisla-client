"use client";

import {
  Alert,
  Autocomplete,
  Box,
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DetailPageHeader } from "@/components/common/detail-page-header";
import { MoneyInput } from "@/components/forms/money-input";
import { ApiError } from "@/lib/api/errors";
import { MEDIA_MAX_BYTES, MEDIA_MAX_DIMENSION } from "@/lib/config/env";
import type { MediaLibraryItem, ProductDetail } from "@/lib/types/products";
import { createThumbnailFile, generatePendingImageId, readImageDimensions, uploadFileToPresignedTarget, validateImageMime, validateImageSize } from "@/modules/products/image-upload";
import { MediaAssetPickerDialog } from "@/modules/products/components/media-asset-picker-dialog";
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

interface PendingImage {
  id: string;
  file: File;
  width: number;
  height: number;
  previewUrl: string;
}

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
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageActionLoadingId, setImageActionLoadingId] = useState<string | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingExistingAssets, setPendingExistingAssets] = useState<MediaLibraryItem[]>([]);
  const [existingImages, setExistingImages] = useState(() => product?.images ?? []);

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

  const sortedExistingImages = useMemo(() => {
    return [...existingImages].sort((left, right) => {
      if (left.is_primary !== right.is_primary) {
        return left.is_primary ? -1 : 1;
      }
      return left.sort_order - right.sort_order;
    });
  }, [existingImages]);

  const disabledLibraryAssetIds = useMemo(() => {
    const ids = new Set<string>(existingImages.map((image) => image.asset_id));
    for (const item of pendingExistingAssets) {
      ids.add(item.asset_id);
    }
    return ids;
  }, [existingImages, pendingExistingAssets]);

  const canMutateImageList = !isCreate && Boolean(product?.id) && !isUploadingImages;

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

  async function refreshExistingImages(productId: string) {
    const images = await productsService.listProductImages(productId);
    setExistingImages(images);
  }

  async function handleUseExistingAssets(items: MediaLibraryItem[]) {
    if (!items.length) {
      return;
    }

    const unique = items.filter((item) => !disabledLibraryAssetIds.has(item.asset_id));
    if (!unique.length) {
      return;
    }

    if (isCreate || !product?.id) {
      setPendingExistingAssets((current) => {
        const byAssetId = new Map(current.map((item) => [item.asset_id, item]));
        for (const item of unique) {
          byAssetId.set(item.asset_id, item);
        }
        return Array.from(byAssetId.values());
      });
      return;
    }

    setGeneralError(null);
    setIsUploadingImages(true);
    let failed = 0;
    try {
      for (const item of unique) {
        try {
          await productsService.attachProductImage(product.id, {
            asset_id: item.asset_id,
          });
        } catch {
          failed += 1;
        }
      }
      await refreshExistingImages(product.id);
      if (failed > 0) {
        setGeneralError(`No se pudieron asociar ${failed} imagen(es) existentes.`);
      }
    } finally {
      setIsUploadingImages(false);
    }
  }

  function removePendingExistingAsset(assetId: string) {
    setPendingExistingAssets((current) => current.filter((item) => item.asset_id !== assetId));
  }

  async function attachPendingExistingAssetsForProduct(productId: string): Promise<{ failed: number }> {
    if (!pendingExistingAssets.length) {
      return { failed: 0 };
    }

    setIsUploadingImages(true);
    const failedAssetIds = new Set<string>();

    try {
      for (const item of pendingExistingAssets) {
        try {
          await productsService.attachProductImage(productId, {
            asset_id: item.asset_id,
          });
        } catch {
          failedAssetIds.add(item.asset_id);
        }
      }

      setPendingExistingAssets((current) => current.filter((item) => failedAssetIds.has(item.asset_id)));
      await refreshExistingImages(productId);
      return { failed: failedAssetIds.size };
    } finally {
      setIsUploadingImages(false);
    }
  }

  async function uploadPendingImagesForProduct(productId: string): Promise<{ failed: number }> {
    if (!pendingImages.length) {
      return { failed: 0 };
    }

    setIsUploadingImages(true);
    const failedIds = new Set<string>();

    try {
      for (const pendingImage of pendingImages) {
        try {
          const thumb = await createThumbnailFile(pendingImage.file, 480);

          const presign = await productsService.presignMediaUpload({
            original: {
              filename: pendingImage.file.name,
              mime: pendingImage.file.type,
              size: pendingImage.file.size,
              width: pendingImage.width,
              height: pendingImage.height,
            },
            thumb: {
              filename: thumb.file.name,
              mime: thumb.file.type,
              size: thumb.file.size,
              width: thumb.width,
              height: thumb.height,
            },
          });

          await uploadFileToPresignedTarget(presign.original, pendingImage.file);
          await uploadFileToPresignedTarget(presign.thumb, thumb.file);

          const completed = await productsService.completeMediaUpload(presign.upload_token);
          await productsService.attachProductImage(productId, {
            asset_id: completed.asset_id,
          });

          URL.revokeObjectURL(pendingImage.previewUrl);
        } catch {
          failedIds.add(pendingImage.id);
        }
      }

      setPendingImages((current) => current.filter((item) => failedIds.has(item.id)));
      await refreshExistingImages(productId);

      return { failed: failedIds.size };
    } finally {
      setIsUploadingImages(false);
    }
  }

  async function handleSelectImages(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    setGeneralError(null);

    const selectedFiles = Array.from(files);
    const nextPending: PendingImage[] = [];
    const errors: string[] = [];

    for (const file of selectedFiles) {
      const mimeError = validateImageMime(file);
      if (mimeError) {
        errors.push(`${file.name}: ${mimeError}`);
        continue;
      }

      const sizeError = validateImageSize(file, MEDIA_MAX_BYTES);
      if (sizeError) {
        errors.push(`${file.name}: ${sizeError}`);
        continue;
      }

      try {
        const dimensions = await readImageDimensions(file);
        if (dimensions.width > MEDIA_MAX_DIMENSION || dimensions.height > MEDIA_MAX_DIMENSION) {
          errors.push(`${file.name}: excede ${MEDIA_MAX_DIMENSION}px por lado.`);
          continue;
        }

        nextPending.push({
          id: generatePendingImageId(),
          file,
          width: dimensions.width,
          height: dimensions.height,
          previewUrl: URL.createObjectURL(file),
        });
      } catch {
        errors.push(`${file.name}: no se pudo leer la imagen.`);
      }
    }

    if (errors.length > 0) {
      setGeneralError(errors.join(" "));
    }

    if (nextPending.length > 0) {
      setPendingImages((current) => [...current, ...nextPending]);
    }
  }

  function removePendingImage(id: string) {
    setPendingImages((current) => {
      const image = current.find((item) => item.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  async function handleSetPrimaryImage(imageId: string) {
    if (!product?.id) {
      return;
    }

    setImageActionLoadingId(imageId);
    setGeneralError(null);
    try {
      await productsService.updateProductImage(product.id, imageId, { is_primary: true });
      await refreshExistingImages(product.id);
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralError(error.detail);
      } else {
        setGeneralError("No fue posible actualizar la imagen principal.");
      }
    } finally {
      setImageActionLoadingId(null);
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!product?.id) {
      return;
    }

    setImageActionLoadingId(imageId);
    setGeneralError(null);
    try {
      await productsService.deleteProductImage(product.id, imageId);
      await refreshExistingImages(product.id);
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralError(error.detail);
      } else {
        setGeneralError("No fue posible borrar la imagen.");
      }
    } finally {
      setImageActionLoadingId(null);
    }
  }

  async function saveProductAndUploads() {
    setGeneralError(null);
    setStockReasonError(null);

    const nextErrors = validateProductForm(form);
    setFormErrors(nextErrors);

    const hasErrors =
      Boolean(nextErrors.sku) ||
      Boolean(nextErrors.name) ||
      Boolean(nextErrors.stock) ||
      Boolean(nextErrors.default_price) ||
      Boolean(nextErrors.extraPrices && Object.keys(nextErrors.extraPrices).length > 0);

    if (hasErrors) {
      return;
    }

    setIsSaving(true);

    try {
      if (isCreate) {
        const createdProduct = await productsService.createProduct(toProductCreatePayload(form));
        const attached = await attachPendingExistingAssetsForProduct(createdProduct.id);
        const uploads = await uploadPendingImagesForProduct(createdProduct.id);

        await queryClient.invalidateQueries({ queryKey: ["products"] });
        await queryClient.invalidateQueries({ queryKey: ["product", createdProduct.id] });

        const suffix = attached.failed + uploads.failed > 0 ? "&upload=partial" : "";
        router.push(`/products/${createdProduct.id}?created=1${suffix}`);
        return;
      }

      if (form.stock.trim() !== product!.stock.trim()) {
        setStockReasonOpen(true);
        return;
      }

      await submitUpdate();
    } finally {
      setIsSaving(false);
    }
  }

  async function submitUpdate(reason?: string) {
    if (!product) {
      return;
    }

    const payload = toProductUpdatePayload(form);

    if (form.stock.trim() !== product.stock.trim()) {
      payload.stock_adjust_reason = reason?.trim() ?? "";
    }

    try {
      const updatedProduct = await productsService.updateProduct(product.id, payload);
      const attached = await attachPendingExistingAssetsForProduct(updatedProduct.id);
      const uploads = await uploadPendingImagesForProduct(updatedProduct.id);

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", updatedProduct.id] });

      const suffix = attached.failed + uploads.failed > 0 ? "&upload=partial" : "";
      setSuccessMessage("Producto actualizado correctamente.");
      router.push(`/products/${updatedProduct.id}?updated=1${suffix}`);
    } catch (error) {
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
    }
  }

  async function handleConfirmStockReason() {
    if (!stockReason.trim()) {
      setStockReasonError("Debes capturar una razon para modificar el stock.");
      return;
    }

    setStockReasonError(null);
    setStockReasonOpen(false);
    await submitUpdate(stockReason);
  }

  async function handleDeleteProduct() {
    if (!product) {
      return;
    }

    setIsDeleting(true);
    setGeneralError(null);

    try {
      await productsService.deleteProduct(product.id);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      setDeleteOpen(false);
      router.push("/products?deleted=1");
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralError(error.detail);
      } else {
        setGeneralError("No fue posible borrar el producto.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleActive() {
    if (!product) {
      return;
    }

    setIsTogglingActive(true);
    setGeneralError(null);

    try {
      const updatedProduct = await productsService.toggleActive(product.id, !product.is_active);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      setToggleActiveOpen(false);
      const action = product.is_active ? "desactivado" : "activado";
      setSuccessMessage(`Producto ${action} correctamente.`);
      router.push(`/products/${updatedProduct.id}?updated=1`);
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralError(error.detail);
      } else {
        setGeneralError("No fue posible cambiar el estado del producto.");
      }
    } finally {
      setIsTogglingActive(false);
    }
  }

  const isBusy = isSaving || isUploadingImages;

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
            ? "Registra un nuevo producto en el catalogo con inventario inicial y precios."
            : "Actualiza datos de inventario, precios y administra imagenes del producto."
        }
        action={
          <Button
            variant="outlined"
            onClick={() => router.push(isCreate ? "/products" : `/products/${product!.id}`)}
            sx={{ borderColor: "rgba(161, 161, 170, 0.22)", color: "#e4e4e7" }}
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
              label="Precio venta publico"
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
              <Typography>Precio venta publico: {profitMetrics.salePrice === null ? "-" : formatCurrency(profitMetrics.salePrice)}</Typography>
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

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Imagenes del producto
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Formatos permitidos: JPG, PNG, WEBP. Maximo {(MEDIA_MAX_BYTES / (1024 * 1024)).toFixed(1)} MB y {MEDIA_MAX_DIMENSION}px por lado.
              </Typography>

              {sortedExistingImages.length > 0 ? (
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5}>
                  {sortedExistingImages.map((image) => (
                    <Paper key={image.id} variant="outlined" sx={{ p: 1.5, width: 220 }}>
                      <Stack spacing={1}>
                        <Box
                          component="img"
                          src={image.thumb_url || image.original_url}
                          alt="Imagen producto"
                          sx={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 1.5 }}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {image.is_primary ? "Principal" : "Secundaria"}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant={image.is_primary ? "contained" : "outlined"}
                            disabled={Boolean(imageActionLoadingId) || !canMutateImageList || image.is_primary}
                            onClick={() => void handleSetPrimaryImage(image.id)}
                          >
                            Primaria
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            disabled={Boolean(imageActionLoadingId) || !canMutateImageList}
                            onClick={() => void handleDeleteImage(image.id)}
                          >
                            Borrar
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aun no hay imagenes asociadas.
                </Typography>
              )}

              <Button variant="outlined" onClick={() => setAssetPickerOpen(true)} disabled={isBusy}>
                Agregar imagenes
              </Button>
              <Typography variant="caption" color="text.secondary">
                Primero selecciona en biblioteca para reutilizar assets existentes. Si no existe, sube una nueva.
              </Typography>

              {pendingExistingAssets.length > 0 ? (
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5}>
                  {pendingExistingAssets.map((asset) => (
                    <Paper key={asset.asset_id} variant="outlined" sx={{ p: 1.5, width: 220 }}>
                      <Stack spacing={1}>
                        <Box
                          component="img"
                          src={asset.thumb_url || asset.original_url}
                          alt={asset.source_product_sku}
                          sx={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 1.5 }}
                        />
                        <Typography variant="caption" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {asset.source_product_sku} - {asset.source_product_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Reutilizar asset existente
                        </Typography>
                        <Button size="small" color="warning" variant="outlined" onClick={() => removePendingExistingAsset(asset.asset_id)} disabled={isBusy}>
                          Quitar
                        </Button>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : null}

              {pendingImages.length > 0 ? (
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5}>
                  {pendingImages.map((image) => (
                    <Paper key={image.id} variant="outlined" sx={{ p: 1.5, width: 220 }}>
                      <Stack spacing={1}>
                        <Box component="img" src={image.previewUrl} alt={image.file.name} sx={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 1.5 }} />
                        <Typography variant="caption" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {image.file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {image.width}x{image.height}
                        </Typography>
                        <Button size="small" color="warning" variant="outlined" onClick={() => removePendingImage(image.id)} disabled={isBusy}>
                          Quitar
                        </Button>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : null}
            </Stack>
          </Paper>

          <Button variant="contained" onClick={() => void saveProductAndUploads()} disabled={isBusy}>
            {isBusy ? "Guardando..." : isCreate ? "Crear producto" : "Guardar cambios"}
          </Button>
        </Stack>
      </Paper>

      <MediaAssetPickerDialog
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        disabledAssetIds={disabledLibraryAssetIds}
        onSelectExisting={handleUseExistingAssets}
        onPickNewFiles={handleSelectImages}
      />

      {!isCreate && product && (
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={2.5}>
            <Stack spacing={1}>
              <Typography variant="h6" sx={{ color: product.is_active === false ? "#6ee7b7" : "#fbbf24" }}>
                {product.is_active === false ? "Producto inactivo" : "Desactivar producto"}
              </Typography>
              <Typography color="text.secondary">
                {product.is_active === false
                  ? "Este producto esta inactivo. No aparece en POS ni catalogo publico."
                  : "Desactivar oculta el producto del POS y catalogo publico sin borrar historial."}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setToggleActiveOpen(true)}
                disabled={isTogglingActive}
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
                Usa esta accion solo si el producto debe salir del catalogo operativo.
              </Typography>
              <Button
                color="error"
                variant="outlined"
                onClick={() => setDeleteOpen(true)}
                disabled={!canDelete || isDeleting}
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
            onClose={isTogglingActive ? undefined : () => setToggleActiveOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {product.is_active === false ? "Reactivar producto" : "Desactivar producto"}
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                {product.is_active === false
                  ? `Deseas reactivar "${product.name}"? Volvera a aparecer en POS y catalogo.`
                  : `Deseas desactivar "${product.name}"? Se ocultara en POS y catalogo.`}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setToggleActiveOpen(false)} disabled={isTogglingActive}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={() => void handleToggleActive()}
                disabled={isTogglingActive}
                color={product.is_active === false ? "primary" : "warning"}
              >
                {isTogglingActive ? "Procesando..." : product.is_active === false ? "Reactivar" : "Desactivar"}
              </Button>
            </DialogActions>
          </Dialog>

          <ProductDeleteDialog
            open={deleteOpen}
            productName={product.name}
            loading={isDeleting}
            onClose={() => setDeleteOpen(false)}
            onConfirm={() => {
              void handleDeleteProduct();
            }}
          />

          <Dialog open={stockReasonOpen} onClose={isSaving ? undefined : () => setStockReasonOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Confirmar cambio de stock</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                {`Vas a cambiar el stock de ${product.stock} a ${form.stock}. Captura la razon del ajuste.`}
              </DialogContentText>
              <TextField
                label="Razon del ajuste"
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
              <Button onClick={() => setStockReasonOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={() => void handleConfirmStockReason()} disabled={isSaving}>
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
