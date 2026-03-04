"use client";

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Pagination,
  Paper,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/common/page-header";
import { MoneyInput } from "@/components/forms/money-input";
import { ApiError } from "@/lib/api/errors";
import type { InvestorAssignmentItem, InvestorLedgerEntry, InvestorLedgerEntryType } from "@/lib/types/investors";
import type { ProductListItem } from "@/lib/types/products";
import { investorsService } from "@/modules/investors/services/investors.service";
import { productsService } from "@/modules/products/services/products.service";
import { formatCurrency, formatDateTime } from "@/modules/products/utils";

const pageSize = 20;

interface PurchaseLineState {
  productId: string;
  productSku: string;
  productName: string;
  availableQty: string;
  qty: string;
  unitCostNet: string;
}

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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.detail;
  }
  return fallback;
}

function roundToMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeDecimal(value: string | number, fallback = "0.00") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return roundToMoney(parsed).toFixed(2);
}

function calculateGross(unitCostNet: string, taxRatePct: string) {
  const net = Number(unitCostNet);
  const taxRate = Number(taxRatePct);
  if (!Number.isFinite(net) || !Number.isFinite(taxRate)) {
    return "0.00";
  }
  return normalizeDecimal(net * (1 + taxRate / 100));
}

function calculateLineTotal(qty: string, unitCostGross: string) {
  const parsedQty = Number(qty);
  const parsedGross = Number(unitCostGross);
  if (!Number.isFinite(parsedQty) || !Number.isFinite(parsedGross)) {
    return "0.00";
  }
  return normalizeDecimal(parsedQty * parsedGross);
}

function entryTypeLabel(entryType: InvestorLedgerEntryType) {
  switch (entryType) {
    case "CAPITAL_DEPOSIT":
      return "Depósito";
    case "CAPITAL_WITHDRAWAL":
      return "Retiro";
    case "CAPITAL_TO_INVENTORY":
      return "Compra de inventario";
    case "INVENTORY_TO_CAPITAL":
      return "Recuperación de capital";
    case "PROFIT_SHARE":
      return "Utilidad";
    case "REINVESTMENT":
      return "Reinversión";
    default:
      return entryType;
  }
}

function formatReference(entry: InvestorLedgerEntry) {
  return `${entry.reference_type} · ${entry.reference_id}`;
}

function hasAvailableStock(assignment: InvestorAssignmentItem) {
  return Number(assignment.qty_available) > 0;
}

function getAssignmentStatus(assignment: InvestorAssignmentItem) {
  if (hasAvailableStock(assignment)) {
    return {
      label: "En stock",
      color: "success" as const,
    };
  }

  return {
    label: "Vendido",
    color: "default" as const,
  };
}

function getLedgerVisual(entry: InvestorLedgerEntry) {
  if (entry.entry_type === "CAPITAL_DEPOSIT") {
    return {
      tone: "info.main",
      background: "rgba(2, 136, 209, 0.08)",
    };
  }

  if (entry.entry_type === "CAPITAL_TO_INVENTORY" || entry.entry_type === "CAPITAL_WITHDRAWAL") {
    return {
      tone: "error.main",
      background: "rgba(211, 47, 47, 0.08)",
    };
  }

  if (entry.entry_type === "PROFIT_SHARE" || entry.entry_type === "INVENTORY_TO_CAPITAL") {
    return {
      tone: "success.main",
      background: "rgba(46, 125, 50, 0.08)",
    };
  }

  return {
    tone: "text.primary",
    background: "transparent",
  };
}

function getPurchaseLineError(line: PurchaseLineState, taxRatePct: string) {
  const qty = Number(line.qty);
  const unitCostNet = Number(line.unitCostNet);
  const availableQty = Number(line.availableQty);
  const unitCostGross = Number(calculateGross(line.unitCostNet, taxRatePct));

  if (!Number.isFinite(qty) || qty <= 0) {
    return "La cantidad debe ser mayor a 0.";
  }

  if (qty > availableQty) {
    return "La cantidad excede la disponibilidad para inversionistas.";
  }

  if (!Number.isFinite(unitCostNet) || unitCostNet <= 0) {
    return "El costo neto debe ser mayor a 0.";
  }

  if (!Number.isFinite(unitCostGross) || unitCostGross <= 0) {
    return "El costo final debe ser mayor a 0.";
  }

  return null;
}

export function InvestorDetailPage() {
  const params = useParams<{ id: string }>();
  const investorId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const queryClient = useQueryClient();
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [taxRatePct, setTaxRatePct] = useState("16.00");
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLineState[]>([]);
  const [capitalMode, setCapitalMode] = useState<"deposit" | "withdraw" | null>(null);
  const [capitalAmount, setCapitalAmount] = useState("");
  const [capitalNote, setCapitalNote] = useState("");
  const [capitalError, setCapitalError] = useState<string | null>(null);
  const debouncedProductSearch = useDebouncedValue(productSearch.trim(), 250);

  const investorQuery = useQuery({
    queryKey: ["investor", investorId],
    queryFn: () => investorsService.getInvestor(investorId ?? ""),
    enabled: Boolean(investorId),
  });

  const assignmentsQuery = useQuery({
    queryKey: ["investor-assignments", investorId, assignmentsPage],
    queryFn: () =>
      investorsService.listInvestorAssignments({
        investor: investorId ?? "",
        page: assignmentsPage,
      }),
    enabled: Boolean(investorId),
  });

  const ledgerQuery = useQuery({
    queryKey: ["investor-ledger", investorId, ledgerPage],
    queryFn: () => investorsService.getInvestorLedger(investorId ?? "", { page: ledgerPage }),
    enabled: Boolean(investorId),
  });

  const productSearchQuery = useQuery({
    queryKey: ["investor-product-search", debouncedProductSearch],
    queryFn: () =>
      productsService.listProducts({
        q: debouncedProductSearch || undefined,
        page: 1,
        has_stock: true,
      }),
    enabled: purchaseOpen,
  });

  const purchaseMutation = useMutation({
    mutationFn: () =>
      investorsService.purchaseProducts(investorId ?? "", {
        tax_rate_pct: normalizeDecimal(taxRatePct, "16.00"),
        lines: purchaseLines.map((line) => ({
          product: line.productId,
          qty: normalizeDecimal(line.qty),
          unit_cost_gross: calculateGross(line.unitCostNet, taxRatePct),
        })),
      }),
    onSuccess: async () => {
      setAssignmentsPage(1);
      setLedgerPage(1);
      setPurchaseOpen(false);
      setPurchaseError(null);
      setPurchaseLines([]);
      setProductSearch("");
      setSelectedProduct(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["investor", investorId] }),
        queryClient.invalidateQueries({ queryKey: ["investor-assignments", investorId] }),
        queryClient.invalidateQueries({ queryKey: ["investor-ledger", investorId] }),
      ]);
    },
    onError: (error) => {
      setPurchaseError(getErrorMessage(error, "No fue posible completar la compra."));
    },
  });

  const capitalMutation = useMutation({
    mutationFn: () => {
      if (!investorId || !capitalMode) {
        throw new Error("Investor not found");
      }

      const payload = {
        amount: capitalAmount.trim(),
        note: capitalNote.trim() ? capitalNote.trim() : undefined,
      };

      if (capitalMode === "deposit") {
        return investorsService.depositCapital(investorId, payload);
      }

      return investorsService.withdrawCapital(investorId, payload);
    },
    onSuccess: async () => {
      setAssignmentsPage(1);
      setLedgerPage(1);
      setCapitalMode(null);
      setCapitalAmount("");
      setCapitalNote("");
      setCapitalError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["investor", investorId] }),
        queryClient.invalidateQueries({ queryKey: ["investor-ledger", investorId] }),
      ]);
    },
    onError: (error) => {
      setCapitalError(getErrorMessage(error, "No fue posible registrar el movimiento."));
    },
  });

  const investor = investorQuery.data;
  const ledgerEntries = ledgerQuery.data?.results ?? [];
  const sortedAssignments = useMemo(
    () => {
      const assignments = assignmentsQuery.data?.results ?? [];

      return [...assignments].sort((left, right) => {
        const leftInStock = hasAvailableStock(left) ? 1 : 0;
        const rightInStock = hasAvailableStock(right) ? 1 : 0;

        if (leftInStock !== rightInStock) {
          return rightInStock - leftInStock;
        }

        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
    },
    [assignmentsQuery.data?.results],
  );
  const capitalAvailable = Number(investor?.balances.capital ?? 0);
  const purchaseTotal = purchaseLines.reduce((total, line) => total + Number(calculateLineTotal(line.qty, calculateGross(line.unitCostNet, taxRatePct))), 0);
  const capitalAfterPurchase = capitalAvailable - purchaseTotal;
  const assignmentsTotalPages = Math.max(1, Math.ceil((assignmentsQuery.data?.count ?? 0) / pageSize));
  const ledgerTotalPages = Math.max(1, Math.ceil((ledgerQuery.data?.count ?? 0) / pageSize));
  const productOptions = (productSearchQuery.data?.results ?? []).filter((product) => Number(product.investor_assignable_qty ?? 0) > 0);

  const baseError = investorQuery.isError ? getErrorMessage(investorQuery.error, "No fue posible cargar el inversionista.") : null;
  const assignmentsError = assignmentsQuery.isError ? getErrorMessage(assignmentsQuery.error, "No fue posible cargar las asignaciones.") : null;
  const ledgerError = ledgerQuery.isError ? getErrorMessage(ledgerQuery.error, "No fue posible cargar el ledger.") : null;

  function closePurchaseDialog() {
    if (purchaseMutation.isPending) {
      return;
    }
    setPurchaseOpen(false);
    setPurchaseError(null);
    setPurchaseLines([]);
    setTaxRatePct("16.00");
    setProductSearch("");
    setSelectedProduct(null);
  }

  function closeCapitalDialog() {
    if (capitalMutation.isPending) {
      return;
    }
    setCapitalMode(null);
    setCapitalAmount("");
    setCapitalNote("");
    setCapitalError(null);
  }

  function addProductLine(product: ProductListItem) {
    const availableQty = Number(product.investor_assignable_qty ?? 0);
    const suggestedCost = typeof product.cost_price === "string" ? product.cost_price : "0.00";

    setPurchaseLines((currentLines) => {
      const existingLine = currentLines.find((line) => line.productId === product.id);
      if (!existingLine) {
        return [
          ...currentLines,
          {
            productId: product.id,
            productSku: product.sku,
            productName: product.name,
            availableQty: normalizeDecimal(product.investor_assignable_qty ?? "0"),
            qty: "1.00",
            unitCostNet: suggestedCost,
          },
        ];
      }

      const nextQty = Number(existingLine.qty) + 1;
      if (nextQty > availableQty) {
        setPurchaseError(`${product.name} ya alcanzó su disponibilidad máxima para inversionistas.`);
        return currentLines;
      }

      return currentLines.map((line) =>
        line.productId === product.id
          ? {
              ...line,
              qty: normalizeDecimal(nextQty),
            }
          : line,
      );
    });

    setPurchaseError(null);
    setSelectedProduct(null);
    setProductSearch("");
  }

  function updatePurchaseLine(productId: string, patch: Partial<PurchaseLineState>) {
    setPurchaseLines((currentLines) =>
      currentLines.map((line) =>
        line.productId === productId
          ? {
              ...line,
              ...patch,
            }
          : line,
      ),
    );
    setPurchaseError(null);
  }

  function removePurchaseLine(productId: string) {
    setPurchaseLines((currentLines) => currentLines.filter((line) => line.productId !== productId));
    setPurchaseError(null);
  }

  async function submitPurchase() {
    if (purchaseLines.length === 0) {
      setPurchaseError("Debes agregar al menos un producto.");
      return;
    }

    for (const line of purchaseLines) {
      const lineError = getPurchaseLineError(line, taxRatePct);
      if (lineError) {
        setPurchaseError(`${line.productName}: ${lineError}`);
        return;
      }
    }

    if (purchaseTotal > capitalAvailable) {
      setPurchaseError("El total de la compra excede el capital disponible.");
      return;
    }

    setPurchaseError(null);
    try {
      await purchaseMutation.mutateAsync();
    } catch {
      return;
    }
  }

  async function submitCapitalOperation() {
    const amount = Number(capitalAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setCapitalError("Debes capturar un monto mayor a 0.");
      return;
    }

    if (capitalMode === "withdraw" && amount > capitalAvailable) {
      setCapitalError("El retiro no puede exceder el capital disponible.");
      return;
    }

    setCapitalError(null);
    try {
      await capitalMutation.mutateAsync();
    } catch {
      return;
    }
  }

  if (investorQuery.isLoading && !investor) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!investorId || !investor) {
    return <Alert severity="error">{baseError ?? "No fue posible encontrar el inversionista."}</Alert>;
  }

  return (
    <Stack spacing={3}>
      <PageHeader title={investor.display_name} description="Consulta su capital, asigna productos y registra movimientos de entrada o salida." />

      {baseError ? <Alert severity="error">{baseError}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Capital disponible
          </Typography>
          <Typography variant="h5">{formatCurrency(investor.balances.capital)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Capital invertido
          </Typography>
          <Typography variant="h5">{formatCurrency(investor.balances.inventory)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Utilidad disponible
          </Typography>
          <Typography variant="h5">{formatCurrency(investor.balances.profit)}</Typography>
        </Paper>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        <Button variant="contained" onClick={() => setPurchaseOpen(true)}>
          Comprar productos
        </Button>
        <Button variant="outlined" onClick={() => setCapitalMode("deposit")}>
          Agregar capital
        </Button>
        <Button variant="outlined" color="error" onClick={() => setCapitalMode("withdraw")}>
          Retirar capital
        </Button>
      </Stack>

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Productos asignados</Typography>
          {assignmentsError ? <Alert severity="error">{assignmentsError}</Alert> : null}
          {assignmentsQuery.isLoading ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : null}
          {!assignmentsQuery.isLoading && sortedAssignments.length === 0 ? (
            <Alert severity="info">Este inversionista todavía no tiene productos asignados.</Alert>
          ) : null}
          {sortedAssignments.length > 0 ? (
            <>
              <TableContainer>
                <Table sx={{ minWidth: 1080 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Producto</TableCell>
                      <TableCell>Estatus</TableCell>
                      <TableCell align="right">Qty asignada</TableCell>
                      <TableCell align="right">Qty vendida</TableCell>
                      <TableCell align="right">Qty disponible</TableCell>
                      <TableCell align="right">Costo unitario</TableCell>
                      <TableCell align="right">Total invertido</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedAssignments.map((assignment) => {
                      const status = getAssignmentStatus(assignment);

                      return (
                      <TableRow
                        key={assignment.id}
                        hover
                        sx={{
                          opacity: status.label === "Vendido" ? 0.78 : 1,
                        }}
                      >
                        <TableCell>{formatDateTime(assignment.created_at)}</TableCell>
                        <TableCell>{assignment.product_sku}</TableCell>
                        <TableCell>
                          <Typography fontWeight={status.label === "En stock" ? 700 : 500}>{assignment.product_name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={status.label} size="small" color={status.color} variant={status.label === "En stock" ? "filled" : "outlined"} />
                        </TableCell>
                        <TableCell align="right">{assignment.qty_assigned}</TableCell>
                        <TableCell align="right">{assignment.qty_sold}</TableCell>
                        <TableCell align="right">{assignment.qty_available}</TableCell>
                        <TableCell align="right">{formatCurrency(assignment.unit_cost)}</TableCell>
                        <TableCell align="right">{formatCurrency(assignment.line_total)}</TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Pagination
                  count={assignmentsTotalPages}
                  page={assignmentsPage}
                  onChange={(_event, nextPage) => setAssignmentsPage(nextPage)}
                  color="primary"
                />
              </Box>
            </>
          ) : null}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Movimientos</Typography>
          {ledgerError ? <Alert severity="error">{ledgerError}</Alert> : null}
          {ledgerQuery.isLoading ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : null}
          {!ledgerQuery.isLoading && ledgerEntries.length === 0 ? (
            <Alert severity="info">Todavía no hay movimientos registrados para este inversionista.</Alert>
          ) : null}
          {ledgerEntries.length > 0 ? (
            <>
              <TableContainer>
                <Table sx={{ minWidth: 1100 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell align="right">Capital delta</TableCell>
                      <TableCell align="right">Inventario delta</TableCell>
                      <TableCell align="right">Utilidad delta</TableCell>
                      <TableCell>Referencia</TableCell>
                      <TableCell>Nota</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ledgerEntries.map((entry) => {
                      const visual = getLedgerVisual(entry);

                      return (
                      <TableRow key={entry.id} hover sx={{ backgroundColor: visual.background }}>
                        <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                        <TableCell>
                          <Typography sx={{ color: visual.tone, fontWeight: 700 }}>{entryTypeLabel(entry.entry_type)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ color: Number(entry.capital_delta) === 0 ? "text.primary" : visual.tone, fontWeight: Number(entry.capital_delta) === 0 ? 500 : 700 }}>
                            {formatCurrency(entry.capital_delta)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ color: Number(entry.inventory_delta) === 0 ? "text.primary" : visual.tone, fontWeight: Number(entry.inventory_delta) === 0 ? 500 : 700 }}>
                            {formatCurrency(entry.inventory_delta)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ color: Number(entry.profit_delta) === 0 ? "text.primary" : visual.tone, fontWeight: Number(entry.profit_delta) === 0 ? 500 : 700 }}>
                            {formatCurrency(entry.profit_delta)}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatReference(entry)}</TableCell>
                        <TableCell>{entry.note || "-"}</TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Pagination count={ledgerTotalPages} page={ledgerPage} onChange={(_event, nextPage) => setLedgerPage(nextPage)} color="primary" />
              </Box>
            </>
          ) : null}
        </Stack>
      </Paper>

      <Dialog open={purchaseOpen} onClose={closePurchaseDialog} fullWidth maxWidth="lg">
        <DialogTitle>Comprar productos</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {purchaseError ? <Alert severity="error">{purchaseError}</Alert> : null}

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Autocomplete
                options={productOptions}
                value={selectedProduct}
                onChange={(_event, value) => {
                  setSelectedProduct(value);
                  if (value) {
                    addProductLine(value);
                  }
                }}
                inputValue={productSearch}
                onInputChange={(_event, value) => setProductSearch(value)}
                loading={productSearchQuery.isLoading}
                filterOptions={(options) => options}
                getOptionLabel={(option) => `${option.sku} · ${option.name}`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar producto"
                    placeholder="Nombre o SKU"
                    helperText="Solo aparecen productos con disponibilidad para inversionistas."
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...optionProps } = props;

                  return (
                    <Box
                      component="li"
                      key={key ?? option.id}
                      {...optionProps}
                      sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
                    >
                      <span>{option.sku} · {option.name}</span>
                      <span>{option.investor_assignable_qty} disp.</span>
                    </Box>
                  );
                }}
                fullWidth
              />

              <MoneyInput label="IVA %" value={taxRatePct} onChange={setTaxRatePct} sx={{ minWidth: { md: 160 } }} />
            </Stack>

            {purchaseLines.length === 0 ? <Alert severity="info">Agrega productos para preparar la compra.</Alert> : null}

            {purchaseLines.length > 0 ? (
              <TableContainer>
                <Table sx={{ minWidth: 1100 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Disponible</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Costo neto</TableCell>
                      <TableCell align="right">Costo final</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="right">Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchaseLines.map((line) => {
                      const unitCostGross = calculateGross(line.unitCostNet, taxRatePct);
                      const lineTotal = calculateLineTotal(line.qty, unitCostGross);
                      const lineError = getPurchaseLineError(line, taxRatePct);

                      return (
                        <TableRow key={line.productId} hover>
                          <TableCell>
                            <Typography fontWeight={700}>{line.productSku}</Typography>
                            <Typography color="text.secondary" variant="body2">
                              {line.productName}
                            </Typography>
                            {lineError ? (
                              <Typography color="error.main" variant="body2">
                                {lineError}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell align="right">{line.availableQty}</TableCell>
                          <TableCell align="right" sx={{ minWidth: 140 }}>
                            <MoneyInput
                              value={line.qty}
                              onChange={(value) => updatePurchaseLine(line.productId, { qty: value })}
                              size="small"
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ minWidth: 160 }}>
                            <MoneyInput
                              value={line.unitCostNet}
                              onChange={(value) => updatePurchaseLine(line.productId, { unitCostNet: value })}
                              size="small"
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(unitCostGross)}</TableCell>
                          <TableCell align="right">{formatCurrency(lineTotal)}</TableCell>
                          <TableCell align="right">
                            <Button color="error" onClick={() => removePurchaseLine(line.productId)}>
                              Quitar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Typography variant="body2">Capital disponible antes: {formatCurrency(investor.balances.capital)}</Typography>
                <Typography variant="body2">Total de compra: {formatCurrency(purchaseTotal)}</Typography>
                <Typography sx={{ color: capitalAfterPurchase < 0 ? "error.main" : "text.primary" }} variant="body2">
                  Capital disponible después: {formatCurrency(capitalAfterPurchase)}
                </Typography>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePurchaseDialog}>Cancelar</Button>
          <Button variant="contained" onClick={submitPurchase} disabled={purchaseMutation.isPending}>
            {purchaseMutation.isPending ? "Comprando..." : "Confirmar compra"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(capitalMode)} onClose={closeCapitalDialog} fullWidth maxWidth="sm">
        <DialogTitle>{capitalMode === "deposit" ? "Agregar capital" : "Retirar capital"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {capitalError ? <Alert severity="error">{capitalError}</Alert> : null}
            <MoneyInput label="Monto" value={capitalAmount} onChange={setCapitalAmount} fullWidth />
            <TextField
              label="Nota (opcional)"
              value={capitalNote}
              onChange={(event) => setCapitalNote(event.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            {capitalMode === "withdraw" ? (
              <Typography color="text.secondary" variant="body2">
                Capital disponible: {formatCurrency(investor.balances.capital)}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCapitalDialog}>Cancelar</Button>
          <Button variant="contained" onClick={submitCapitalOperation} disabled={capitalMutation.isPending}>
            {capitalMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
