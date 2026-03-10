"use client";

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api/errors";
import { MEDIA_MAX_BYTES, MEDIA_MAX_DIMENSION } from "@/lib/config/env";
import type { MediaLibraryItem } from "@/lib/types/products";
import type { ImportLine, ImportLinePreviewImage } from "@/lib/types/purchases";
import { createThumbnailFile, readImageDimensions, uploadFileToPresignedTarget, validateImageMime, validateImageSize } from "@/modules/products/image-upload";
import { MediaAssetPickerDialog } from "@/modules/products/components/media-asset-picker-dialog";
import { productsService } from "@/modules/products/services/products.service";
import { applyKnownProductMatches, parseMyesaInvoice } from "@/modules/purchases/parsers/myesa.parser";
import { purchasesService } from "@/modules/purchases/services/purchases.service";
import { taxonomyService } from "@/modules/taxonomy/services/taxonomy.service";

const IVA_RATE = 0.16;
const PUBLIC_PRICE_MARKUP = 1.3;
const CREATE_PREFIX = "__create__::";

type EditableImportLine = ImportLine & { publicPriceTouched?: boolean };

interface ProductPreviewCardProps {
  line: EditableImportLine;
  brandNames: string[];
  typeNames: string[];
  brandResults: Array<{ id: string; name: string }>;
  typeResults: Array<{ id: string; name: string }>;
  onLineChange: (lineId: string, patch: Partial<EditableImportLine>) => void;
  onBrandSearch: (value: string) => void;
  onTypeSearch: (value: string) => void;
  onCreateBrand: (lineId: string, name: string) => Promise<void>;
  onCreateProductType: (lineId: string, name: string) => Promise<void>;
}

function getMatchStatusVisual(status: EditableImportLine["match_status"]) {
  if (status === "MATCHED_PRODUCT") {
    return {
      label: "COINCIDE",
      color: "#86efac",
      backgroundColor: "rgba(16, 185, 129, 0.16)",
      borderColor: "rgba(16, 185, 129, 0.32)",
    };
  }

  if (status === "NEW_PRODUCT") {
    return {
      label: "NUEVO",
      color: "#fde68a",
      backgroundColor: "rgba(245, 158, 11, 0.16)",
      borderColor: "rgba(245, 158, 11, 0.32)",
    };
  }

  if (status === "AMBIGUOUS") {
    return {
      label: "AMBIGUO",
      color: "#bfdbfe",
      backgroundColor: "rgba(59, 130, 246, 0.16)",
      borderColor: "rgba(59, 130, 246, 0.32)",
    };
  }

  return {
    label: "INVÁLIDO",
    color: "#fecaca",
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    borderColor: "rgba(239, 68, 68, 0.32)",
  };
}

const darkPanelSx = {
  p: { xs: 2.5, md: 3 },
  borderRadius: 4,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(17, 24, 39, 0.92) 100%)",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.2)",
  "& .MuiInputLabel-root": {
    color: "rgba(226, 232, 240, 0.72)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#bfdbfe",
  },
  "& .MuiFormHelperText-root": {
    color: "rgba(226, 232, 240, 0.56)",
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    backgroundColor: "rgba(15, 23, 42, 0.36)",
    color: "#f8fafc",
    "& fieldset": {
      borderColor: "rgba(148, 163, 184, 0.18)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(148, 163, 184, 0.28)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "rgba(96, 165, 250, 0.52)",
    },
  },
} as const;

function parseAmount(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const normalized = value.replace(/,/g, "").trim();
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toMoney(value: number): string {
  return value.toFixed(2);
}

function formatMaskedMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMaskedMoneyString(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  return formatMaskedMoney(parseAmount(value));
}

function normalizeDecimalForApi(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  return value.replace(/,/g, "").trim();
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

function rowCostWithTax(line: EditableImportLine): number {
  return parseAmount(line.unit_cost) * (1 + IVA_RATE);
}

function rowMarkupAmount(line: EditableImportLine): number {
  return parseAmount(line.public_price) - rowCostWithTax(line);
}

function rowMarkupPercent(line: EditableImportLine): number {
  const base = rowCostWithTax(line);
  if (base <= 0) {
    return 0;
  }
  return (rowMarkupAmount(line) / base) * 100;
}

function defaultPublicPrice(unitCost: number): number {
  return unitCost * (1 + IVA_RATE) * PUBLIC_PRICE_MARKUP;
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

function toEditableLine(line: ReturnType<typeof parseMyesaInvoice>[number], index: number): EditableImportLine {
  const localId = `preview-${index + 1}-${line.sku || "no-sku"}`;
  const derivedCostWithTax =
    line.unit_cost !== null && line.unit_cost !== undefined
      ? toMoney(Number(line.unit_cost) * (1 + IVA_RATE))
      : line.unit_price !== null && line.unit_price !== undefined
        ? String(line.unit_price)
        : null;
  return {
    id: localId,
    line_no: index + 1,
    raw_line: line.raw_line,
    parsed_sku: line.sku,
    parsed_name: line.name,
    parsed_qty: line.qty,
    parsed_unit_cost: line.unit_cost,
    parsed_unit_price: line.unit_price,
    sku: line.sku,
    name: line.name,
    qty: line.qty,
    unit_cost: formatMaskedMoneyString(line.unit_cost),
    unit_price: formatMaskedMoneyString(derivedCostWithTax),
    public_price: formatMaskedMoneyString(line.public_price),
    brand_name: line.brand_name,
    product_type_name: line.product_type_name,
    brand: null,
    product_type: null,
    matched_product: line.matched_product ?? null,
    match_status: line.match_status,
    is_selected: line.is_selected,
    notes: line.notes,
    publicPriceTouched: false,
    preview_images: [],
  };
}

function generatePreviewImageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function revokePreviewImageUrls(images: ImportLinePreviewImage[] | undefined) {
  if (!images?.length) {
    return;
  }

  for (const image of images) {
    if (image.file && image.preview_url.startsWith("blob:")) {
      URL.revokeObjectURL(image.preview_url);
    }
  }
}

function revokeLinePreviewUrls(lines: EditableImportLine[]) {
  for (const line of lines) {
    revokePreviewImageUrls(line.preview_images);
  }
}

const ProductPreviewCard = memo(function ProductPreviewCard({
  line,
  brandNames,
  typeNames,
  brandResults,
  typeResults,
  onLineChange,
  onBrandSearch,
  onTypeSearch,
  onCreateBrand,
  onCreateProductType,
}: ProductPreviewCardProps) {
  const [draft, setDraft] = useState(line);
  const [imageError, setImageError] = useState<string | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(line);
    setImageError(null);
  }, [line]);

  const updateDraft = useCallback((patch: Partial<EditableImportLine>) => {
    setDraft((current) => {
      const nextDraft = { ...current, ...patch };
      if (patch.unit_cost !== undefined) {
        const unitCost = parseAmount(String(patch.unit_cost));
        nextDraft.unit_price = unitCost > 0 ? formatMaskedMoney(unitCost * (1 + IVA_RATE)) : null;
        if (!current.publicPriceTouched) {
          nextDraft.public_price = formatMaskedMoney(defaultPublicPrice(unitCost));
        }
      }
      if (patch.unit_cost !== undefined && !current.publicPriceTouched) {
        const unitCost = parseAmount(String(patch.unit_cost));
        nextDraft.public_price = formatMaskedMoney(defaultPublicPrice(unitCost));
      }
      if (patch.public_price !== undefined) {
        nextDraft.publicPriceTouched = true;
      }
      return nextDraft;
    });
  }, []);

  const commitDraft = useCallback(
    (patch: Partial<EditableImportLine>) => {
      onLineChange(line.id, patch);
    },
    [line.id, onLineChange],
  );

  const costWithTax = rowCostWithTax(draft);
  const rowTotal = parseAmount(draft.qty) * parseAmount(draft.unit_cost);
  const matchVisual = getMatchStatusVisual(draft.match_status);
  const selectedImages = useMemo(() => draft.preview_images ?? [], [draft.preview_images]);
  const firstSelectedImage = selectedImages[0];
  const selectedExistingAssetIds = useMemo(() => {
    return new Set(selectedImages.map((image) => image.existing_asset_id).filter((id): id is string => Boolean(id)));
  }, [selectedImages]);

  const handleSelectImage = useCallback(async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    const nextImages: ImportLinePreviewImage[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
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

        nextImages.push({
          id: generatePreviewImageId(),
          file,
          preview_url: URL.createObjectURL(file),
          width: dimensions.width,
          height: dimensions.height,
        });
      } catch {
        errors.push(`${file.name}: no se pudo leer la imagen seleccionada.`);
      }
    }

    if (nextImages.length > 0) {
      const mergedImages = [...selectedImages, ...nextImages];
      const patch: Partial<EditableImportLine> = {
        preview_images: mergedImages,
      };
      updateDraft(patch);
      commitDraft(patch);
    }

    setImageError(errors.length > 0 ? errors.join(" ") : null);
  }, [commitDraft, selectedImages, updateDraft]);

  const removeSelectedImage = useCallback((previewImageId: string) => {
    const remainingImages = selectedImages.filter((image) => image.id !== previewImageId);
    const removedImage = selectedImages.find((image) => image.id === previewImageId);
    if (removedImage?.file && removedImage.preview_url.startsWith("blob:")) {
      URL.revokeObjectURL(removedImage.preview_url);
    }

    const patch: Partial<EditableImportLine> = {
      preview_images: remainingImages,
    };
    updateDraft(patch);
    commitDraft(patch);
    setImageError(null);
  }, [commitDraft, selectedImages, updateDraft]);

  const removeAllSelectedImages = useCallback(() => {
    revokePreviewImageUrls(selectedImages);
    const patch: Partial<EditableImportLine> = {
      preview_images: [],
    };
    updateDraft(patch);
    commitDraft(patch);
    setImageError(null);
  }, [commitDraft, selectedImages, updateDraft]);

  const handleSelectExistingAsset = useCallback(async (items: MediaLibraryItem[]) => {
    if (!items.length) {
      return;
    }

    const nextImages = items
      .filter((item) => !selectedExistingAssetIds.has(item.asset_id))
      .map<ImportLinePreviewImage>((item) => ({
        id: generatePreviewImageId(),
        preview_url: item.thumb_url || item.original_url,
        width: item.width,
        height: item.height,
        existing_asset_id: item.asset_id,
      }));
    if (!nextImages.length) {
      return;
    }

    const patch: Partial<EditableImportLine> = {
      preview_images: [...selectedImages, ...nextImages],
    };
    updateDraft(patch);
    commitDraft(patch);
    setImageError(null);
  }, [commitDraft, selectedExistingAssetIds, selectedImages, updateDraft]);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3.5,
        borderColor: draft.is_selected ? "rgba(96, 165, 250, 0.28)" : "rgba(148, 163, 184, 0.14)",
        background:
          draft.is_selected
            ? "linear-gradient(180deg, rgba(15, 23, 42, 0.68) 0%, rgba(30, 41, 59, 0.6) 100%)"
            : "linear-gradient(180deg, rgba(15, 23, 42, 0.52) 0%, rgba(30, 41, 59, 0.48) 100%)",
        boxShadow: draft.is_selected ? "0 18px 40px rgba(15, 23, 42, 0.18)" : "none",
        "& .MuiInputLabel-root": {
          color: "rgba(226, 232, 240, 0.72)",
        },
        "& .MuiInputLabel-root.Mui-focused": {
          color: "#bfdbfe",
        },
        "& .MuiFormHelperText-root": {
          color: "rgba(226, 232, 240, 0.56)",
        },
        "& .MuiOutlinedInput-root": {
          borderRadius: 2.5,
          backgroundColor: "rgba(15, 23, 42, 0.3)",
          color: "#f8fafc",
          "& fieldset": {
            borderColor: "rgba(148, 163, 184, 0.16)",
          },
          "&:hover fieldset": {
            borderColor: "rgba(148, 163, 184, 0.26)",
          },
          "&.Mui-focused fieldset": {
            borderColor: "rgba(96, 165, 250, 0.52)",
          },
        },
      }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Checkbox
                checked={draft.is_selected}
                onChange={(event) => {
                  updateDraft({ is_selected: event.target.checked });
                  commitDraft({ is_selected: event.target.checked });
                }}
                sx={{ color: "rgba(191, 219, 254, 0.75)" }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#e2e8f0" }}>
                Línea {draft.line_no}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={draft.is_selected ? "Incluida" : "Omitida"}
                sx={{
                  fontWeight: 800,
                  color: draft.is_selected ? "#dbeafe" : "#e2e8f0",
                  backgroundColor: draft.is_selected ? "rgba(37, 99, 235, 0.14)" : "rgba(148, 163, 184, 0.14)",
                  border: `1px solid ${draft.is_selected ? "rgba(37, 99, 235, 0.22)" : "rgba(148, 163, 184, 0.16)"}`,
                }}
              />
              <Chip
                size="small"
                label={matchVisual.label}
                sx={{
                  fontWeight: 800,
                  color: matchVisual.color,
                  backgroundColor: matchVisual.backgroundColor,
                  border: `1px solid ${matchVisual.borderColor}`,
                }}
              />
            </Stack>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
            <TextField
              size="small"
              label="SKU"
              value={draft.sku}
              onChange={(event) => updateDraft({ sku: event.target.value })}
              onBlur={() => commitDraft({ sku: draft.sku })}
              sx={{ minWidth: 220 }}
            />
            <Box
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: 2.5,
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(148, 163, 184, 0.12)",
                minWidth: { xs: "100%", md: 240 },
              }}
            >
              <Typography variant="caption" sx={{ color: "rgba(191, 219, 254, 0.78)", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Importe de línea
              </Typography>
              <Typography sx={{ color: "#f8fafc", fontWeight: 900 }}>{formatMoney(rowTotal)}</Typography>
            </Box>
          </Stack>

          <TextField
            label="Descripción"
            multiline
            minRows={3}
            value={draft.name}
            onChange={(event) => updateDraft({ name: event.target.value })}
            onBlur={() => commitDraft({ name: draft.name })}
            fullWidth
          />

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                size="small"
                label="Qty"
                value={draft.qty ?? ""}
                onChange={(event) => updateDraft({ qty: event.target.value })}
                onBlur={() => commitDraft({ qty: draft.qty })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                size="small"
                label="Costo"
                value={draft.unit_cost ?? ""}
                onChange={(event) => updateDraft({ unit_cost: event.target.value })}
                onBlur={() => {
                  const unitCost = formatMaskedMoneyString(draft.unit_cost);
                  const normalizedCost = parseAmount(unitCost ?? "");
                  const patch: Partial<EditableImportLine> = {
                    unit_cost: unitCost,
                    unit_price: unitCost ? formatMaskedMoney(normalizedCost * (1 + IVA_RATE)) : null,
                  };
                  if (!draft.publicPriceTouched) {
                    patch.public_price = unitCost ? formatMaskedMoney(defaultPublicPrice(parseAmount(unitCost))) : null;
                  }
                  updateDraft(patch);
                  commitDraft(patch);
                }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                size="small"
                label="Costo + IVA"
                value={draft.unit_cost ? formatMaskedMoney(costWithTax) : ""}
                helperText="Calculado automáticamente"
                fullWidth
                slotProps={{
                  input: {
                    readOnly: true,
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                size="small"
                label="Precio público"
                value={draft.public_price ?? ""}
                onChange={(event) => updateDraft({ public_price: event.target.value })}
                onBlur={() => {
                  const publicPrice = formatMaskedMoneyString(draft.public_price);
                  updateDraft({ public_price: publicPrice });
                  commitDraft({ public_price: publicPrice });
                }}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack
                spacing={0.5}
                sx={{
                  mt: 0.5,
                  p: 1.25,
                  borderRadius: 2.5,
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(148, 163, 184, 0.12)",
                }}
              >
                <Typography variant="caption" sx={{ color: "#e2e8f0", fontWeight: 700 }}>
                  Margen proyectado: {formatMoney(rowMarkupAmount(draft))}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(191, 219, 254, 0.72)" }}>
                  {rowMarkupPercent(draft).toFixed(2)}%
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                freeSolo
                size="small"
                options={getOptionsWithCreate(brandNames, draft.brand_name)}
                value={draft.brand_name}
                onInputChange={(_event, value) => {
                  updateDraft({ brand_name: value.toUpperCase(), brand: null });
                  onBrandSearch(value);
                }}
                onChange={async (_event, value) => {
                  if (!value) {
                    return;
                  }
                  if (value.startsWith(CREATE_PREFIX)) {
                    await onCreateBrand(line.id, value.replace(CREATE_PREFIX, ""));
                    return;
                  }
                  const matched = brandResults.find((brand) => brand.name === value);
                  updateDraft({ brand_name: value, brand: matched?.id ?? null });
                  commitDraft({ brand_name: value, brand: matched?.id ?? null });
                }}
                getOptionLabel={displayOption}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Marca"
                    error={draft.is_selected && !draft.brand_name.trim()}
                    helperText={draft.is_selected && !draft.brand_name.trim() ? "Marca obligatoria" : " "}
                    onBlur={() => commitDraft({ brand_name: draft.brand_name, brand: draft.brand })}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                freeSolo
                size="small"
                options={getOptionsWithCreate(typeNames, draft.product_type_name)}
                value={draft.product_type_name}
                onInputChange={(_event, value) => {
                  updateDraft({ product_type_name: value.toUpperCase(), product_type: null });
                  onTypeSearch(value);
                }}
                onChange={async (_event, value) => {
                  if (!value) {
                    return;
                  }
                  if (value.startsWith(CREATE_PREFIX)) {
                    await onCreateProductType(line.id, value.replace(CREATE_PREFIX, ""));
                    return;
                  }
                  const matched = typeResults.find((item) => item.name === value);
                  updateDraft({ product_type_name: value, product_type: matched?.id ?? null });
                  commitDraft({ product_type_name: value, product_type: matched?.id ?? null });
                }}
                getOptionLabel={displayOption}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tipo de producto"
                    error={draft.is_selected && !draft.product_type_name.trim()}
                    helperText={draft.is_selected && !draft.product_type_name.trim() ? "Tipo obligatorio" : " "}
                    onBlur={() => commitDraft({ product_type_name: draft.product_type_name, product_type: draft.product_type })}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Stack spacing={1.25}>
            <Typography variant="caption" sx={{ color: "rgba(191, 219, 254, 0.82)", fontWeight: 700 }}>
              Imagen del producto
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ md: "center" }}>
              <Box
                sx={{
                  width: 104,
                  height: 104,
                  borderRadius: 2,
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  backgroundColor: "rgba(15, 23, 42, 0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {firstSelectedImage ? (
                  <Box component="img" src={firstSelectedImage.preview_url} alt={`preview-${draft.sku}`} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Typography variant="caption" sx={{ color: "rgba(226, 232, 240, 0.58)", textAlign: "center", px: 1 }}>
                    Sin imagen
                  </Typography>
                )}
              </Box>
              <Stack spacing={0.75}>
                <Button size="small" variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => setAssetPickerOpen(true)}>
                  {selectedImages.length > 0 ? "Agregar/Cambiar imagenes" : "Biblioteca / subir"}
                </Button>
                {selectedImages.length > 0 ? (
                  <Button size="small" color="warning" variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={removeAllSelectedImages}>
                    Quitar todas
                  </Button>
                ) : null}
                <Typography variant="caption" sx={{ color: "rgba(226, 232, 240, 0.58)" }}>
                  JPG/PNG/WEBP · Máx {(MEDIA_MAX_BYTES / (1024 * 1024)).toFixed(1)} MB · {MEDIA_MAX_DIMENSION}px.
                </Typography>
                {firstSelectedImage ? (
                  <Typography variant="caption" sx={{ color: "rgba(191, 219, 254, 0.72)" }}>
                    1ra imagen: {firstSelectedImage.width}x{firstSelectedImage.height} · Total: {selectedImages.length}
                  </Typography>
                ) : null}
                {imageError ? (
                  <Typography variant="caption" sx={{ color: "#fca5a5" }}>
                    {imageError}
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          </Stack>

          {selectedImages.length > 0 ? (
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
              {selectedImages.map((image) => (
                <Paper
                  key={image.id}
                  variant="outlined"
                  sx={{
                    p: 0.75,
                    width: 94,
                    borderColor: "rgba(148, 163, 184, 0.25)",
                    backgroundColor: "rgba(15, 23, 42, 0.35)",
                  }}
                >
                  <Stack spacing={0.5}>
                    <Box component="img" src={image.preview_url} alt={`img-${image.id}`} sx={{ width: "100%", height: 66, objectFit: "cover", borderRadius: 1 }} />
                    <Typography variant="caption" sx={{ color: "rgba(226, 232, 240, 0.72)", lineHeight: 1.2 }}>
                      {image.existing_asset_id ? "Existente" : "Nueva"}
                    </Typography>
                    <Button size="small" color="warning" variant="outlined" onClick={() => removeSelectedImage(image.id)} sx={{ minHeight: 22, py: 0 }}>
                      Quitar
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </CardContent>

      <MediaAssetPickerDialog
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        selectionMode="multiple"
        disabledAssetIds={selectedExistingAssetIds}
        onSelectExisting={handleSelectExistingAsset}
        onPickNewFiles={handleSelectImage}
      />
    </Card>
  );
});

export default function PurchasesImportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState("");
  const [parserId, setParserId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [tax, setTax] = useState("");
  const [total, setTotal] = useState("");
  const [rawText, setRawText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [lines, setLines] = useState<EditableImportLine[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const linesRef = useRef<EditableImportLine[]>([]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    return () => {
      revokeLinePreviewUrls(linesRef.current);
    };
  }, []);

  const suppliersQuery = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => purchasesService.getSuppliers(),
  });

  const parsersQuery = useQuery({
    queryKey: ["supplier-parsers", supplierId],
    queryFn: () => purchasesService.getParsersBySupplier(supplierId),
    enabled: Boolean(supplierId),
  });

  const brandsQuery = useQuery({
    queryKey: ["brands", brandSearch],
    queryFn: () => taxonomyService.searchBrands(brandSearch),
  });

  const productTypesQuery = useQuery({
    queryKey: ["product-types", typeSearch],
    queryFn: () => taxonomyService.searchProductTypes(typeSearch),
  });

  const filteredLines = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return lines;
    }
    return lines.filter((line) => line.sku.toLowerCase().includes(q) || line.name.toLowerCase().includes(q));
  }, [lines, searchTerm]);

  const computedSubtotal = useMemo(() => {
    return lines
      .filter((line) => line.is_selected)
      .reduce((acc, line) => acc + parseAmount(line.qty) * parseAmount(line.unit_cost), 0);
  }, [lines]);

  const computedTax = useMemo(() => computedSubtotal * IVA_RATE, [computedSubtotal]);
  const computedTotal = useMemo(() => computedSubtotal + parseAmount(tax || toMoney(computedTax)), [computedSubtotal, computedTax, tax]);
  const selectedItemsCount = useMemo(() => lines.filter((line) => line.is_selected).length, [lines]);
  const selectedPiecesCount = useMemo(
    () => lines.filter((line) => line.is_selected).reduce((acc, line) => acc + parseAmount(line.qty), 0),
    [lines],
  );

  const brandResults = useMemo(() => brandsQuery.data?.results ?? [], [brandsQuery.data]);
  const typeResults = useMemo(() => productTypesQuery.data?.results ?? [], [productTypesQuery.data]);
  const brandNames = useMemo(() => brandResults.map((brand) => brand.name), [brandResults]);
  const typeNames = useMemo(() => typeResults.map((item) => item.name), [typeResults]);

  async function handleParse() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!supplierId || !parserId) {
      setErrorMessage("Selecciona proveedor y tipo de factura antes de parsear.");
      return;
    }

    if (!rawText.trim()) {
      setErrorMessage("Pega el texto de la factura antes de parsear.");
      return;
    }

    const selectedParser = parsersQuery.data?.results.find((parser) => parser.id === parserId);
    if (!selectedParser) {
      setErrorMessage("No fue posible resolver el parser seleccionado.");
      return;
    }

    if (selectedParser.parser_key !== "myesa") {
      setErrorMessage(`Parser ${selectedParser.parser_key} no soportado en cliente por ahora.`);
      return;
    }

    try {
      const allBrandsResponse = await queryClient.fetchQuery({
        queryKey: ["brands", "__all__"],
        queryFn: () => taxonomyService.searchBrands(""),
      });

      const locallyParsedLines = parseMyesaInvoice(rawText, {
        knownBrands: allBrandsResponse.results.map((brand) => brand.name),
      });
      const uniqueSkus = [...new Set(locallyParsedLines.map((line) => line.sku.trim().toUpperCase()).filter(Boolean))];
      const matchedProducts = (
        await Promise.all(
          uniqueSkus.map(async (sku) => {
            const response = await productsService.listProducts({ q: sku, page: 1 });
            return response.results.find((product) => product.sku.trim().toUpperCase() === sku) ?? null;
          }),
        )
      ).filter((product): product is NonNullable<typeof product> => Boolean(product));

      const parsedLines = applyKnownProductMatches(locallyParsedLines, matchedProducts).map(toEditableLine);
      revokeLinePreviewUrls(linesRef.current);
      setLines(parsedLines);

      const parsedSubtotal = parsedLines
        .filter((line) => line.is_selected)
        .reduce((acc, line) => acc + parseAmount(line.qty) * parseAmount(line.unit_cost), 0);
      const parsedTax = parsedSubtotal * IVA_RATE;

      if (!subtotal) {
        setSubtotal(toMoney(parsedSubtotal));
      }
      if (!tax) {
        setTax(toMoney(parsedTax));
      }
      if (!total) {
        setTotal(toMoney(parsedSubtotal + parsedTax));
      }

      setSuccessMessage(`Preview generado en cliente con ${parsedLines.length} líneas.`);
    } catch {
      setErrorMessage("No fue posible cargar marcas para el parseo.");
    }
  }

  const handleLineUpdate = useCallback((lineId: string, patch: Partial<EditableImportLine>) => {
    setLines((prev) =>
      prev.map((item) => {
        if (item.id !== lineId) {
          return item;
        }

        if (patch.preview_images !== undefined) {
          const nextIds = new Set(patch.preview_images.map((previewImage) => previewImage.id));
          const removedImages = (item.preview_images ?? []).filter((previewImage) => !nextIds.has(previewImage.id));
          revokePreviewImageUrls(removedImages);
        }

        const nextLine: EditableImportLine = { ...item, ...patch };
        if (patch.unit_cost !== undefined && !item.publicPriceTouched) {
          const unitCost = parseAmount(String(patch.unit_cost));
          nextLine.public_price = formatMaskedMoney(defaultPublicPrice(unitCost));
        }
        if (patch.unit_cost !== undefined) {
          const unitCost = parseAmount(String(patch.unit_cost));
          nextLine.unit_price = unitCost > 0 ? formatMaskedMoney(unitCost * (1 + IVA_RATE)) : null;
        }
        if (patch.public_price !== undefined) {
          nextLine.publicPriceTouched = true;
        }
        return nextLine;
      }),
    );
  }, []);

  const createBrandForLine = useCallback(async (lineId: string, name: string) => {
    setErrorMessage(null);
    try {
      const created = await taxonomyService.createBrand(name);
      setBrandSearch(created.name);
      await queryClient.invalidateQueries({ queryKey: ["brands"] });
      handleLineUpdate(lineId, { brand: created.id, brand_name: created.name });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible crear la marca.");
      }
    }
  }, [handleLineUpdate, queryClient]);

  const createProductTypeForLine = useCallback(async (lineId: string, name: string) => {
    setErrorMessage(null);
    try {
      const created = await taxonomyService.createProductType(name);
      setTypeSearch(created.name);
      await queryClient.invalidateQueries({ queryKey: ["product-types"] });
      handleLineUpdate(lineId, { product_type: created.id, product_type_name: created.name });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible crear el tipo de producto.");
      }
    }
  }, [handleLineUpdate, queryClient]);

  const resolveProductIdByLine = useCallback(async (line: EditableImportLine, skuCache: Map<string, string | null>) => {
    if (line.matched_product) {
      return line.matched_product;
    }

    const sku = line.sku.trim().toUpperCase();
    if (!sku) {
      return null;
    }

    if (skuCache.has(sku)) {
      return skuCache.get(sku) ?? null;
    }

    const response = await productsService.listProducts({ q: sku, page: 1, include_inactive: true });
    const exactMatch = response.results.find((product) => product.sku.trim().toUpperCase() === sku);
    const productId = exactMatch?.id ?? null;
    skuCache.set(sku, productId);
    return productId;
  }, []);

  const attachLineImage = useCallback(async (line: EditableImportLine, productId: string) => {
    const selectedImages = line.preview_images ?? [];
    if (!selectedImages.length) {
      return;
    }

    let isFirst = true;
    for (const selectedImage of selectedImages) {
      if (selectedImage.existing_asset_id) {
        await productsService.attachProductImage(productId, {
          asset_id: selectedImage.existing_asset_id,
          is_primary: line.match_status === "NEW_PRODUCT" && isFirst ? true : undefined,
        });
        isFirst = false;
        continue;
      }

      const imageFile = selectedImage.file;
      if (!imageFile) {
        continue;
      }

      const dimensions = { width: selectedImage.width, height: selectedImage.height };
      const thumb = await createThumbnailFile(imageFile, 480);

      const presign = await productsService.presignMediaUpload({
        original: {
          filename: imageFile.name,
          mime: imageFile.type,
          size: imageFile.size,
          width: dimensions.width,
          height: dimensions.height,
        },
        thumb: {
          filename: thumb.file.name,
          mime: thumb.file.type,
          size: thumb.file.size,
          width: thumb.width,
          height: thumb.height,
        },
      });

      await uploadFileToPresignedTarget(presign.original, imageFile);
      await uploadFileToPresignedTarget(presign.thumb, thumb.file);

      const completed = await productsService.completeMediaUpload(presign.upload_token);
      await productsService.attachProductImage(productId, {
        asset_id: completed.asset_id,
        is_primary: line.match_status === "NEW_PRODUCT" && isFirst ? true : undefined,
      });
      isFirst = false;
    }
  }, []);

  const uploadPreviewImagesForSelection = useCallback(async (sourceLines: EditableImportLine[]): Promise<number> => {
    const linesWithImage = sourceLines.filter((line) => line.is_selected && (line.preview_images?.length ?? 0) > 0);
    if (!linesWithImage.length) {
      return 0;
    }

    let failed = 0;
    const skuCache = new Map<string, string | null>();

    for (const line of linesWithImage) {
      try {
        const productId = await resolveProductIdByLine(line, skuCache);
        if (!productId) {
          failed += 1;
          continue;
        }
        await attachLineImage(line, productId);
      } catch {
        failed += 1;
      }
    }

    return failed;
  }, [attachLineImage, resolveProductIdByLine]);

  async function confirmBatch() {
    if (!supplierId || !parserId) {
      setErrorMessage("Selecciona proveedor y tipo de factura antes de confirmar.");
      return;
    }

    if (!lines.length) {
      setErrorMessage("No hay líneas en preview para confirmar.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setWorking(true);
    try {
      const confirmed = await purchasesService.previewConfirm({
        supplier: supplierId,
        parser: parserId,
        invoice_number: invoiceNumber || undefined,
        invoice_date: invoiceDate || undefined,
        subtotal: subtotal || undefined,
        tax: tax || undefined,
        total: total || undefined,
        raw_text: rawText,
        lines: lines.map((line) => ({
          sku: line.sku,
          name: line.name,
          qty: line.qty,
          unit_cost: normalizeDecimalForApi(line.unit_cost),
          unit_price: normalizeDecimalForApi(line.unit_price),
          public_price: normalizeDecimalForApi(line.public_price),
          brand_name: line.brand_name,
          product_type_name: line.product_type_name,
          brand_id: line.brand ?? undefined,
          product_type_id: line.product_type ?? undefined,
          is_selected: line.is_selected,
          notes: line.notes,
        })),
      });

      const failedUploads = await uploadPreviewImagesForSelection(linesRef.current);
      await queryClient.invalidateQueries({ queryKey: ["purchase-receipts"] });
      const uploadSuffix = failedUploads > 0 ? "&upload=partial" : "";
      revokeLinePreviewUrls(linesRef.current);
      linesRef.current = [];
      router.push(`/purchases/receipts?created=1&receiptId=${encodeURIComponent(confirmed.purchase_receipt_id)}${uploadSuffix}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "subtotal_mismatch") {
          const batchSubtotal = String(error.fields.batch_subtotal ?? "?");
          const computed = String(error.fields.computed_subtotal ?? "?");
          setErrorMessage(`Subtotal no coincide. Factura: ${batchSubtotal} / Líneas: ${computed}`);
        } else if (error.code === "taxonomy_not_found") {
          setErrorMessage("Marca/tipo inexistente. Crea o selecciona un valor válido antes de confirmar.");
        } else {
          setErrorMessage(error.detail);
        }
      } else {
        setErrorMessage("No fue posible confirmar la compra.");
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 4,
          color: "#e2e8f0",
          background: "linear-gradient(135deg, #0f172a 0%, #13213c 45%, #16324f 100%)",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          boxShadow: "0 28px 60px rgba(15, 23, 42, 0.22)",
        }}
      >
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Box>
              <Typography
                variant="overline"
                sx={{ color: "rgba(191, 219, 254, 0.9)", letterSpacing: "0.18em", fontWeight: 800 }}
              >
                Compras operativas
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.03em" }}>
                Registrar nueva compra
              </Typography>
              <Typography sx={{ color: "rgba(226, 232, 240, 0.76)" }}>
                Flujo: parse local inmediato, edición por producto y confirmación segura en backend.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${selectedItemsCount} artículos`}
                sx={{
                  fontWeight: 800,
                  color: "#dbeafe",
                  backgroundColor: "rgba(37, 99, 235, 0.14)",
                  border: "1px solid rgba(37, 99, 235, 0.2)",
                }}
              />
              <Chip
                label={`${selectedPiecesCount.toFixed(2)} piezas`}
                sx={{
                  fontWeight: 800,
                  color: "#d1fae5",
                  backgroundColor: "rgba(16, 185, 129, 0.14)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
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
                  Subtotal
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  {formatMoney(computedSubtotal)}
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
                  IVA calculado
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  {formatMoney(parseAmount(tax || toMoney(computedTax)))}
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
                  Total estimado
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  {formatMoney(parseAmount(total || toMoney(computedTotal)))}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Paper>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper sx={darkPanelSx}>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#f8fafc" }}>
            Encabezado
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              select
              label="Proveedor"
              value={supplierId}
              onChange={(event) => {
                setSupplierId(event.target.value);
                setParserId("");
              }}
              fullWidth
            >
              {(suppliersQuery.data?.results ?? []).map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.code} - {supplier.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Tipo factura" value={parserId} onChange={(event) => setParserId(event.target.value)} fullWidth>
              {(parsersQuery.data?.results ?? []).map((parser) => (
                <MenuItem key={parser.id} value={parser.id}>
                  {parser.parser_key.toUpperCase()} v{parser.version}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField label="No. Factura" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} fullWidth />
            <TextField
              label="Fecha"
              type="date"
              value={invoiceDate}
              onChange={(event) => setInvoiceDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              label="Subtotal"
              value={subtotal}
              onChange={(event) => setSubtotal(event.target.value)}
              helperText={`Calculado: ${toMoney(computedSubtotal)}`}
              fullWidth
            />
            <TextField
              label="IVA"
              value={tax}
              onChange={(event) => setTax(event.target.value)}
              helperText={`Calculado 16%: ${toMoney(computedTax)}`}
              fullWidth
            />
            <TextField
              label="Total"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              helperText={`Calculado: ${toMoney(computedTotal)}`}
              fullWidth
            />
          </Stack>
        </Stack>
      </Paper>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" variant="filled" sx={{ width: "100%" }}>
          {successMessage ?? ""}
        </Alert>
      </Snackbar>

      <Paper sx={darkPanelSx}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#f8fafc" }}>
            Texto factura
          </Typography>
          <TextField
            multiline
            minRows={8}
            placeholder="Pega aquí la factura MYESA"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleParse}
            disabled={working}
            sx={{
              alignSelf: "flex-start",
              minHeight: 46,
              px: 2.5,
              fontWeight: 800,
              borderRadius: 2.5,
            }}
          >
            {working ? <CircularProgress color="inherit" size={20} /> : "Parsear factura"}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={darkPanelSx}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#f8fafc" }}>
                Preview por producto
              </Typography>
              <Typography sx={{ color: "rgba(226, 232, 240, 0.72)" }}>
                Cada card representa una línea parseada y editable antes de confirmar la compra, incluyendo imagen opcional del producto.
              </Typography>
            </Box>
            <TextField
              size="small"
              label="Filtrar por SKU/Descripción"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              sx={{ minWidth: 280 }}
            />
          </Stack>

          {filteredLines.map((line) => (
            <ProductPreviewCard
              key={line.id}
              line={line}
              brandNames={brandNames}
              typeNames={typeNames}
              brandResults={brandResults}
              typeResults={typeResults}
              onLineChange={handleLineUpdate}
              onBrandSearch={setBrandSearch}
              onTypeSearch={setTypeSearch}
              onCreateBrand={createBrandForLine}
              onCreateProductType={createProductTypeForLine}
            />
          ))}

          <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.16)" }} />
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(148, 163, 184, 0.12)",
            }}
          >
            <Typography sx={{ color: "#e2e8f0" }}>Total artículos seleccionados: {selectedItemsCount}</Typography>
            <Typography sx={{ color: "#e2e8f0" }}>Total piezas seleccionadas: {selectedPiecesCount.toFixed(2)}</Typography>
            <Typography sx={{ color: "#e2e8f0" }}>Subtotal líneas seleccionadas: {formatMoney(computedSubtotal)}</Typography>
            <Typography sx={{ color: "#e2e8f0" }}>IVA (16%): {formatMoney(parseAmount(tax || toMoney(computedTax)))}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#f8fafc" }}>
              Total: {formatMoney(parseAmount(total || toMoney(computedTotal)))}
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <Button
              variant="contained"
              onClick={confirmBatch}
              disabled={!lines.length || working}
              sx={{
                minHeight: 46,
                px: 2.5,
                fontWeight: 800,
                borderRadius: 2.5,
              }}
            >
              {working ? <CircularProgress color="inherit" size={20} /> : "Confirmar compra"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
