"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { MediaLibraryItem } from "@/lib/types/products";
import { productsService } from "@/modules/products/services/products.service";

interface MediaAssetPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectExisting: (items: MediaLibraryItem[]) => Promise<void> | void;
  onPickNewFiles: (files: FileList | null) => Promise<void> | void;
  disabledAssetIds?: Set<string>;
  selectionMode?: "single" | "multiple";
}

export function MediaAssetPickerDialog({
  open,
  onClose,
  onSelectExisting,
  onPickNewFiles,
  disabledAssetIds,
  selectionMode = "multiple",
}: MediaAssetPickerDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const libraryQuery = useQuery({
    queryKey: ["media-library"],
    queryFn: () => productsService.listMediaLibrary({ max_pages: 8 }),
    enabled: open,
    staleTime: 30_000,
  });

  const items = useMemo(() => libraryQuery.data ?? [], [libraryQuery.data]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(
      (item) =>
        item.source_product_sku.toLowerCase().includes(q) ||
        item.source_product_name.toLowerCase().includes(q) ||
        item.mime_type.toLowerCase().includes(q),
    );
  }, [items, searchTerm]);

  const selectedItems = useMemo(() => items.filter((item) => selectedAssetIds.includes(item.asset_id)), [items, selectedAssetIds]);

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSelectedAssetIds([]);
      setActionError(null);
    }
  }, [open]);

  function toggleSelection(assetId: string) {
    setSelectedAssetIds((current) => {
      if (current.includes(assetId)) {
        return current.filter((id) => id !== assetId);
      }
      if (selectionMode === "single") {
        return [assetId];
      }
      return [...current, assetId];
    });
  }

  async function handleConfirm() {
    if (!selectedItems.length) {
      return;
    }
    setActionError(null);
    setSubmitting(true);
    try {
      await onSelectExisting(selectedItems);
      setSelectedAssetIds([]);
      onClose();
    } catch {
      setActionError("No fue posible usar las imagenes seleccionadas.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePickNewFiles(files: FileList | null) {
    setActionError(null);
    setSubmitting(true);
    try {
      await onPickNewFiles(files);
      onClose();
    } catch {
      setActionError("No fue posible seleccionar nuevas imagenes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Biblioteca de imagenes</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Primero selecciona imagenes existentes para evitar duplicados. Si no existe, sube una nueva.
          </Typography>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              size="small"
              label="Buscar por SKU o nombre"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={() => void libraryQuery.refetch()}
              disabled={submitting || libraryQuery.isFetching}
              sx={{ minWidth: 140 }}
            >
              {libraryQuery.isFetching ? "Actualizando..." : "Actualizar"}
            </Button>
          </Stack>

          {actionError ? <Alert severity="error">{actionError}</Alert> : null}

          {libraryQuery.isLoading ? (
            <Stack alignItems="center" py={3}>
              <CircularProgress size={26} />
            </Stack>
          ) : null}

          {!libraryQuery.isLoading && filteredItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay imagenes disponibles en biblioteca.
            </Typography>
          ) : null}

          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5}>
            {filteredItems.map((item) => {
              const disabled = disabledAssetIds?.has(item.asset_id) ?? false;
              const selected = selectedAssetIds.includes(item.asset_id);
              return (
                <Button
                  key={item.asset_id}
                  onClick={() => !disabled && toggleSelection(item.asset_id)}
                  disabled={disabled || submitting}
                  variant={selected ? "contained" : "outlined"}
                  sx={{
                    width: 190,
                    p: 1,
                    textTransform: "none",
                    display: "block",
                    borderRadius: 2,
                    borderColor: selected ? undefined : "rgba(161, 161, 170, 0.3)",
                    opacity: disabled ? 0.55 : 1,
                  }}
                >
                  <Box
                    component="img"
                    src={item.thumb_url || item.original_url}
                    alt={item.source_product_sku}
                    sx={{ width: "100%", height: 118, objectFit: "cover", borderRadius: 1 }}
                  />
                  <Typography variant="caption" sx={{ mt: 0.75, display: "block", fontWeight: 700 }}>
                    {item.source_product_sku}
                  </Typography>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                    {item.source_product_name}
                  </Typography>
                  <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                    Uso: {item.usage_count}
                  </Typography>
                  {disabled ? (
                    <Typography variant="caption" sx={{ display: "block", color: "warning.main" }}>
                      Ya asociada
                    </Typography>
                  ) : null}
                </Button>
              );
            })}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button component="label" variant="outlined" disabled={submitting}>
          Subir nuevas imagenes
          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onClick={(event) => {
              event.currentTarget.value = "";
            }}
            onChange={(event) => {
              void handlePickNewFiles(event.target.files);
            }}
          />
        </Button>
        <Button variant="contained" onClick={() => void handleConfirm()} disabled={submitting || selectedItems.length === 0}>
          {submitting
            ? "Aplicando..."
            : selectionMode === "single"
              ? selectedItems.length > 0
                ? "Usar seleccionada"
                : "Seleccionar imagen"
              : `Usar seleccionadas (${selectedItems.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
