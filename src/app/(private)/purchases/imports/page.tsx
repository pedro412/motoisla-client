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
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api/errors";
import type { ImportLine } from "@/lib/types/purchases";
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
    unit_price: formatMaskedMoneyString(line.unit_price),
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
  };
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

  useEffect(() => {
    setDraft(line);
  }, [line]);

  const updateDraft = useCallback((patch: Partial<EditableImportLine>) => {
    setDraft((current) => {
      const nextDraft = { ...current, ...patch };
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

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Checkbox
                checked={draft.is_selected}
                onChange={(event) => {
                  updateDraft({ is_selected: event.target.checked });
                  commitDraft({ is_selected: event.target.checked });
                }}
              />
              <Typography variant="subtitle2">Sel</Typography>
            </Stack>
            <TextField
              size="small"
              label="SKU"
              value={draft.sku}
              onChange={(event) => updateDraft({ sku: event.target.value })}
              onBlur={() => commitDraft({ sku: draft.sku })}
              sx={{ minWidth: 200 }}
            />
            <Chip size="small" label={draft.match_status} />
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
                  const patch: Partial<EditableImportLine> = { unit_cost: unitCost };
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
                label="Venta"
                value={draft.unit_price ?? ""}
                onChange={(event) => updateDraft({ unit_price: event.target.value })}
                onBlur={() => {
                  const unitPrice = formatMaskedMoneyString(draft.unit_price);
                  updateDraft({ unit_price: unitPrice });
                  commitDraft({ unit_price: unitPrice });
                }}
                fullWidth
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
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                <Typography variant="caption">Margen: {formatMoney(rowMarkupAmount(draft))}</Typography>
                <Typography variant="caption" color="text.secondary">
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

          <Typography variant="caption" color="text.secondary">
            Imagen: Próximamente
          </Typography>
        </Stack>
      </CardContent>
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

        const nextLine: EditableImportLine = { ...item, ...patch };
        if (patch.unit_cost !== undefined && !item.publicPriceTouched) {
          const unitCost = parseAmount(String(patch.unit_cost));
          nextLine.public_price = formatMaskedMoney(defaultPublicPrice(unitCost));
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

      await queryClient.invalidateQueries({ queryKey: ["purchase-receipts"] });
      router.push(`/purchases/receipts?created=1&receiptId=${encodeURIComponent(confirmed.purchase_receipt_id)}`);
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
      <Typography variant="h4">Compras (Importación factura)</Typography>
      <Typography color="text.secondary">
        Flujo: parse local inmediato - cards editables - confirmación segura en backend.
      </Typography>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Encabezado</Typography>
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

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Texto factura</Typography>
          <TextField
            multiline
            minRows={8}
            placeholder="Pega aquí la factura MYESA"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            fullWidth
          />
          <Button variant="contained" onClick={handleParse} disabled={working}>
            {working ? <CircularProgress color="inherit" size={20} /> : "Parsear factura"}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Typography variant="h6">Preview por producto</Typography>
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

          <Divider />
          <Box>
            <Typography>Total artículos seleccionados: {selectedItemsCount}</Typography>
            <Typography>Total piezas seleccionadas: {selectedPiecesCount.toFixed(2)}</Typography>
            <Typography>Subtotal líneas seleccionadas: {formatMoney(computedSubtotal)}</Typography>
            <Typography>IVA (16%): {formatMoney(parseAmount(tax || toMoney(computedTax)))}</Typography>
            <Typography variant="h6">Total: {formatMoney(parseAmount(total || toMoney(computedTotal)))}</Typography>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <Button variant="contained" onClick={confirmBatch} disabled={!lines.length || working}>
              {working ? <CircularProgress color="inherit" size={20} /> : "Confirmar compra"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
