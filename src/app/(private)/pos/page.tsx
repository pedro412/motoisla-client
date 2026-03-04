"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Chip,
  ClickAwayListener,
  Collapse,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { customerService } from "@/modules/customers/services/customer.service";
import { layawayService } from "@/modules/layaway/services/layaway.service";
import type { CardCommissionPlan, CardType, PaymentMethod, ProductSearchItem, SaleResponse } from "@/lib/types/sales";
import { salesService } from "@/modules/sales/services/sales.service";

interface CartLine {
  product: ProductSearchItem;
  qty: number;
  unitPrice: number;
  unitCost: number;
  discountPct: number;
}

function currency(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

function rateSourceLabel(source?: string) {
  if (source === "MTD_REAL") {
    return "Fuente: mes actual";
  }
  if (source === "FALLBACK_BASE") {
    return "Fuente: tasa base";
  }
  return "Fuente: no disponible";
}

function toMoneyInput(value: string) {
  return value.replace(/[^0-9.]/g, "");
}

function roundUpToStep(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function buildCashSuggestions(total: number) {
  const exact = Number(total.toFixed(2));
  const next500 = roundUpToStep(exact, 500);
  const next200 = roundUpToStep(exact, 200);

  return [exact, next500, next200].filter((amount, index, all) => all.indexOf(amount) === index);
}

function legacyCardTypeForPlan(plan: CardCommissionPlan | null): CardType | undefined {
  if (!plan) {
    return undefined;
  }
  if (plan.installments_months === 0) {
    return "NORMAL";
  }
  if (plan.installments_months === 3) {
    return "MSI_3";
  }
  return undefined;
}

function stockChip(stock: number) {
  return (
    <Chip
      size="small"
      label={`${stock} en stock`}
      color="success"
      sx={{
        fontWeight: 700,
        "& .MuiChip-label": { px: 1.25 },
      }}
    />
  );
}

function statusBadge(label: string, tone: "sky" | "emerald" | "amber") {
  const tones = {
    sky: {
      bg: "rgba(56, 189, 248, 0.14)",
      border: "rgba(56, 189, 248, 0.24)",
      color: "#bae6fd",
    },
    emerald: {
      bg: "rgba(16, 185, 129, 0.14)",
      border: "rgba(16, 185, 129, 0.24)",
      color: "#a7f3d0",
    },
    amber: {
      bg: "rgba(245, 158, 11, 0.14)",
      border: "rgba(245, 158, 11, 0.24)",
      color: "#fde68a",
    },
  } as const;
  const toneStyles = tones[tone];

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        borderRadius: 1.5,
        fontWeight: 800,
        backgroundColor: toneStyles.bg,
        color: toneStyles.color,
        border: `1px solid ${toneStyles.border}`,
      }}
    />
  );
}

export default function PosPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [overrideUser, setOverrideUser] = useState("");
  const [overridePass, setOverridePass] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerCreditBalance, setCustomerCreditBalance] = useState(0);
  const [creditToApply, setCreditToApply] = useState("");
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [layawayOpen, setLayawayOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [layawaySubmitting, setLayawaySubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [layawayDeposit, setLayawayDeposit] = useState("");
  const [layawayNotes, setLayawayNotes] = useState("");
  const [layawayExpiresAt, setLayawayExpiresAt] = useState("");
  const [useInstallments, setUseInstallments] = useState(false);
  const [selectedInstallmentPlanId, setSelectedInstallmentPlanId] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [completedSale, setCompletedSale] = useState<SaleResponse | null>(null);
  const [changeDue, setChangeDue] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const cardPlansQuery = useQuery({
    queryKey: ["card-commission-plans"],
    queryFn: () => salesService.listCardCommissionPlans(),
    staleTime: 60_000,
  });

  const cardPlans = cardPlansQuery.data?.results;
  const normalCardPlan = useMemo(
    () => cardPlans?.find((plan) => plan.installments_months === 0) ?? null,
    [cardPlans],
  );
  const installmentPlans = useMemo(
    () => cardPlans?.filter((plan) => plan.installments_months > 0) ?? [],
    [cardPlans],
  );

  useEffect(() => {
    if (paymentMethod !== "CARD") {
      setUseInstallments(false);
      setSelectedInstallmentPlanId("");
      return;
    }

    if (!useInstallments) {
      return;
    }

    if (installmentPlans.length === 0) {
      setSelectedInstallmentPlanId("");
      return;
    }

    const hasSelected = installmentPlans.some((plan) => plan.id === selectedInstallmentPlanId);
    if (!hasSelected) {
      setSelectedInstallmentPlanId(installmentPlans[0].id);
    }
  }, [installmentPlans, paymentMethod, selectedInstallmentPlanId, useInstallments]);

  useEffect(() => {
    const query = search.trim();

    if (!query || query.length < 2) {
      setProducts([]);
      setSearchLoading(false);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await salesService.searchProducts({ q: query });
        if (!active) {
          return;
        }
        setProducts(response.results);
        setSearchOpen(true);
      } catch (error) {
        if (!active) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Error al buscar productos");
      } finally {
        if (active) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  useEffect(() => {
    if (!layawayExpiresAt) {
      const next = new Date();
      next.setDate(next.getDate() + 30);
      setLayawayExpiresAt(next.toISOString().slice(0, 10));
    }
  }, [layawayExpiresAt]);

  useEffect(() => {
    const phone = customerPhone.trim();
    if (!phone) {
      setCustomerCreditBalance(0);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setCustomerLookupLoading(true);
      try {
        const [customer, credit] = await Promise.all([
          customerService.getCustomerByPhone(phone),
          customerService.getCreditByPhone(phone),
        ]);
        if (!active) {
          return;
        }
        if (customer?.name) {
          setCustomerName(customer.name);
        }
        setCustomerCreditBalance(Number(credit?.balance ?? 0));
      } catch {
        if (active) {
          setCustomerCreditBalance(0);
        }
      } finally {
        if (active) {
          setCustomerLookupLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [customerPhone]);

  const subtotal = lines.reduce((acc, line) => acc + line.qty * line.unitPrice, 0);
  const discount = lines.reduce((acc, line) => acc + line.qty * line.unitPrice * (line.discountPct / 100), 0);
  const total = subtotal - discount;
  const itemCount = lines.reduce((acc, line) => acc + line.qty, 0);
  const searchHasQuery = search.trim().length >= 2;
  const showSearchMenu = searchOpen && searchHasQuery && (searchLoading || products.length > 0);
  const selectedCardPlan = useMemo(() => {
    if (paymentMethod !== "CARD") {
      return null;
    }
    if (!useInstallments) {
      return normalCardPlan;
    }
    return installmentPlans.find((plan) => plan.id === selectedInstallmentPlanId) ?? installmentPlans[0] ?? null;
  }, [installmentPlans, normalCardPlan, paymentMethod, selectedInstallmentPlanId, useInstallments]);
  const estimatedCommission = selectedCardPlan ? total * Number(selectedCardPlan.commission_rate) : 0;
  const completedItemCount = useMemo(
    () =>
      completedSale?.lines.reduce((acc, line) => acc + Number(line.qty), 0) ?? 0,
    [completedSale],
  );
  const safeCreditToApply = Math.min(Math.max(Number(creditToApply || 0), 0), customerCreditBalance, total);
  const remainingAfterCredit = Math.max(total - safeCreditToApply, 0);
  const cashSuggestions = useMemo(() => buildCashSuggestions(remainingAfterCredit), [remainingAfterCredit]);
  const receivedAmount = Number(cashReceived || 0);
  const previewChange =
    paymentMethod === "CASH" && Number.isFinite(receivedAmount) ? Math.max(receivedAmount - remainingAfterCredit, 0) : 0;
  const profitabilityPreviewPayload = useMemo(
    () => ({
      lines: lines.map((line) => ({
        product: line.product.id,
        qty: line.qty.toFixed(2),
        unit_price: line.unitPrice.toFixed(2),
        unit_cost: line.unitCost.toFixed(2),
        discount_pct: line.discountPct.toFixed(2),
      })),
      payments: [
        ...(safeCreditToApply > 0
          ? ([
              {
                method: "CUSTOMER_CREDIT" as PaymentMethod,
                amount: safeCreditToApply.toFixed(2),
              },
            ] as const)
          : []),
        ...(remainingAfterCredit > 0
          ? ([
              {
                method: paymentMethod,
                amount: remainingAfterCredit.toFixed(2),
                card_plan_id: paymentMethod === "CARD" ? selectedCardPlan?.id : undefined,
                card_type: paymentMethod === "CARD" ? legacyCardTypeForPlan(selectedCardPlan) : undefined,
              },
            ] as const)
          : []),
      ],
    }),
    [lines, paymentMethod, remainingAfterCredit, safeCreditToApply, selectedCardPlan],
  );

  const profitabilityPreviewQuery = useQuery({
    queryKey: ["sales-profitability-preview", profitabilityPreviewPayload],
    queryFn: () => salesService.previewProfitability(profitabilityPreviewPayload),
    enabled: checkoutOpen && lines.length > 0,
    staleTime: 15_000,
    retry: false,
  });

  function resetCheckoutState() {
    setCheckoutOpen(false);
    setPaymentMethod("CASH");
    setUseInstallments(false);
    setSelectedInstallmentPlanId("");
    setCashReceived("");
    setCreditToApply("");
  }

  function resetSaleBuilder() {
    setLines([]);
    setSearch("");
    setProducts([]);
    setSearchOpen(false);
    setCustomerPhone("");
    setCustomerName("");
    setCustomerCreditBalance(0);
    setCreditToApply("");
    setLayawayDeposit("");
    setLayawayNotes("");
    setOverrideUser("");
    setOverridePass("");
    setOverrideReason("");
    setShowAdvanced(false);
  }

  function addOrIncrementLine(product: ProductSearchItem) {
    const productStock = Number(product.stock);
    if (productStock <= 0) {
      setInfoMessage(`No hay stock disponible para ${product.name}.`);
      return;
    }

    const existingIndex = lines.findIndex((line) => line.product.id === product.id);
    if (existingIndex === -1) {
      setLines([
        ...lines,
        {
          product,
          qty: 1,
          unitPrice: Number(product.default_price),
          unitCost: Number(product.default_price) * 0.6,
          discountPct: 0,
        },
      ]);
      setSearch("");
      setProducts([]);
      setSearchOpen(false);
      setInfoMessage(null);
      return;
    }

    const existingLine = lines[existingIndex];
    if (existingLine.qty >= productStock) {
      setInfoMessage(`Stock máximo alcanzado para ${product.name}.`);
      return;
    }

    setLines(
      lines.map((line, lineIndex) => (lineIndex === existingIndex ? { ...line, qty: line.qty + 1 } : line)),
    );
    setSearch("");
    setProducts([]);
    setSearchOpen(false);
    setInfoMessage(null);
  }

  function updateLine(index: number, patch: Partial<CartLine>) {
    setLines(lines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  function setLineQty(index: number, nextQty: number) {
    const targetLine = lines[index];
    if (!targetLine) {
      return;
    }

    const maxQty = Math.max(0, Number(targetLine.product.stock));
    const sanitizedQty = Number.isFinite(nextQty) ? nextQty : 0;
    const clampedQty = Math.min(Math.max(0, sanitizedQty), maxQty);

    if (sanitizedQty > maxQty) {
      setInfoMessage(`Stock máximo alcanzado para ${targetLine.product.name}.`);
    } else {
      setInfoMessage(null);
    }

    if (clampedQty <= 0) {
      setLines(lines.filter((_, lineIndex) => lineIndex !== index));
      return;
    }

    setLines(lines.map((line, lineIndex) => (lineIndex === index ? { ...line, qty: clampedQty } : line)));
  }

  function removeLine(productId: string) {
    setLines(lines.filter((line) => line.product.id !== productId));
  }

  function openCheckout() {
    if (lines.length === 0) {
      setErrorMessage("Debes agregar al menos un producto antes de cobrar.");
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setPaymentMethod("CASH");
    setUseInstallments(false);
    setSelectedInstallmentPlanId("");
    setCashReceived(total.toFixed(2));
    setCheckoutOpen(true);
  }

  function openLayaway() {
    if (lines.length === 0) {
      setErrorMessage("Debes agregar al menos un producto antes de crear un apartado.");
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setLayawayDeposit((total * 0.3).toFixed(2));
    if (!layawayExpiresAt) {
      const next = new Date();
      next.setDate(next.getDate() + 30);
      setLayawayExpiresAt(next.toISOString().slice(0, 10));
    }
    setLayawayOpen(true);
  }

  async function handleCheckoutConfirm() {
    const payloadTotal = Number(total.toFixed(2));
    const creditAmount = Number(safeCreditToApply.toFixed(2));
    const remainingAmount = Number(remainingAfterCredit.toFixed(2));
    if (payloadTotal < 0) {
      setErrorMessage("El total no puede ser negativo.");
      return;
    }

    if (paymentMethod === "CASH" && remainingAmount > 0) {
      if (!cashReceived) {
        setErrorMessage("Captura cuánto entregó el cliente.");
        return;
      }
      if (!Number.isFinite(receivedAmount) || receivedAmount < remainingAmount) {
        setErrorMessage("El efectivo recibido debe ser mayor o igual al saldo restante.");
        return;
      }
    }

    if (paymentMethod === "CARD" && remainingAmount > 0 && !selectedCardPlan) {
      setErrorMessage("No hay un plan de comisión disponible para tarjeta.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    let draftSale: SaleResponse | null = null;
    try {
      const payments = [];
      if (creditAmount > 0) {
        payments.push({
          method: "CUSTOMER_CREDIT" as PaymentMethod,
          amount: creditAmount.toFixed(2),
        });
      }
      if (remainingAmount > 0) {
        payments.push({
          method: paymentMethod,
          amount: remainingAmount.toFixed(2),
          card_plan_id: paymentMethod === "CARD" ? selectedCardPlan?.id : undefined,
          card_type: paymentMethod === "CARD" ? legacyCardTypeForPlan(selectedCardPlan) : undefined,
        });
      }
      const payload = {
        lines: lines.map((line) => ({
          product: line.product.id,
          qty: line.qty.toFixed(2),
          unit_price: line.unitPrice.toFixed(2),
          unit_cost: line.unitCost.toFixed(2),
          discount_pct: line.discountPct.toFixed(2),
        })),
        payments,
        customer_phone: customerPhone.trim() || undefined,
        customer_name: customerName.trim() || undefined,
        override_admin_username: overrideUser || undefined,
        override_admin_password: overridePass || undefined,
        override_reason: overrideReason || undefined,
      };

      draftSale = await salesService.createSale(payload);
      const confirmedSale = await salesService.confirmSale(draftSale.id);
      setCompletedSale(confirmedSale);
      setChangeDue(paymentMethod === "CASH" ? Math.max(receivedAmount - remainingAmount, 0) : 0);
      resetCheckoutState();
      resetSaleBuilder();
      setSuccessOpen(true);
      setInfoMessage("Venta cobrada correctamente.");
    } catch (error) {
      if (error instanceof ApiError) {
        if (draftSale) {
          setErrorMessage(`La venta ${draftSale.id} quedó en borrador pero no se pudo confirmar: ${error.detail}`);
        } else {
          setErrorMessage(error.detail);
        }
      } else {
        setErrorMessage(draftSale ? `La venta ${draftSale.id} quedó en borrador pero no se pudo confirmar.` : "No fue posible cobrar la venta.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLayawayConfirm() {
    const depositAmount = Number(layawayDeposit || 0);
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage("Nombre y teléfono son obligatorios para crear un apartado.");
      return;
    }
    if (!Number.isFinite(depositAmount) || depositAmount <= 0 || depositAmount > total) {
      setErrorMessage("El anticipo debe ser mayor a 0 y no exceder el total.");
      return;
    }
    if (!layawayExpiresAt) {
      setErrorMessage("Debes capturar la fecha límite.");
      return;
    }

    setLayawaySubmitting(true);
    setErrorMessage(null);
    try {
      await layawayService.createLayaway({
        customer: {
          phone: customerPhone.trim(),
          name: customerName.trim(),
        },
        lines: lines.map((line) => ({
          product: line.product.id,
          qty: line.qty.toFixed(2),
          unit_price: line.unitPrice.toFixed(2),
          unit_cost: line.unitCost.toFixed(2),
          discount_pct: line.discountPct.toFixed(2),
        })),
        deposit_payments: [{ method: "CASH", amount: depositAmount.toFixed(2) }],
        expires_at: new Date(`${layawayExpiresAt}T23:59:00`).toISOString(),
        notes: layawayNotes.trim() || undefined,
      });
      setLayawayOpen(false);
      resetSaleBuilder();
      setInfoMessage("Apartado creado correctamente.");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible crear el apartado.");
      }
    } finally {
      setLayawaySubmitting(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 2.25, md: 3 },
          border: "1px solid rgba(56, 189, 248, 0.14)",
          background:
            "radial-gradient(circle at top right, rgba(56, 189, 248, 0.16), transparent 35%), radial-gradient(circle at top left, rgba(16, 185, 129, 0.14), transparent 28%), linear-gradient(135deg, rgba(2, 6, 23, 0.98) 0%, rgba(15, 23, 42, 0.96) 100%)",
          boxShadow: "0 24px 64px rgba(2, 6, 23, 0.28)",
        }}
      >
        <Stack spacing={2.25}>
          <Box>
            <Typography variant="overline" sx={{ color: "#bae6fd", fontWeight: 800, letterSpacing: "0.08em" }}>
              Punto de venta
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Nueva Venta
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 500, mt: 0.5 }}>
              Construye el carrito, valida al cliente y cierra la operación desde un flujo más claro de caja.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
            {statusBadge(`${itemCount} artículos`, "sky")}
            {statusBadge(`Subtotal ${currency(subtotal)}`, "emerald")}
            {statusBadge(`Descuento ${currency(discount)}`, "amber")}
          </Stack>
        </Stack>
      </Paper>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {infoMessage ? <Alert severity="info">{infoMessage}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.8fr) minmax(320px, 0.9fr)" },
          alignItems: "start",
        }}
      >
        <Stack spacing={3}>
          <ClickAwayListener onClickAway={() => setSearchOpen(false)}>
            <Box sx={{ position: "relative" }}>
              <Paper
                sx={{
                  p: 2.5,
                  border: "1px solid rgba(56, 189, 248, 0.14)",
                  background:
                    "linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(15, 23, 42, 0.96) 100%)",
                }}
              >
                <Stack spacing={1.25}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Buscar producto
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                      Agrega productos por nombre o SKU y arma el carrito sin salir de caja.
                    </Typography>
                  </Box>

                  <TextField
                    label="Buscar producto"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setErrorMessage(null);
                    }}
                    onFocus={() => {
                      if (search.trim().length >= 2) {
                        setSearchOpen(true);
                      }
                    }}
                    placeholder="Busca por nombre o SKU"
                    fullWidth
                    helperText={search.trim().length === 1 ? "Escribe al menos 2 caracteres para buscar." : " "}
                  />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
                    {statusBadge("Búsqueda rápida", "sky")}
                    {statusBadge("Alta visibilidad de stock", "emerald")}
                  </Stack>
                </Stack>
              </Paper>

              {showSearchMenu ? (
                <Paper
                  elevation={10}
                  sx={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    borderRadius: 3,
                    overflow: "hidden",
                    border: "1px solid rgba(56, 189, 248, 0.14)",
                    background:
                      "linear-gradient(180deg, rgba(17, 24, 39, 0.99) 0%, rgba(15, 23, 42, 0.98) 100%)",
                  }}
                >
                  {searchLoading ? (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1.5 }}>
                      <CircularProgress size={18} />
                      <Typography color="text.secondary" variant="body2">
                        Buscando productos...
                      </Typography>
                    </Stack>
                  ) : null}

                  {!searchLoading && products.length === 0 ? (
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography color="text.secondary" variant="body2">
                        No hay productos para la búsqueda actual.
                      </Typography>
                    </Box>
                  ) : null}

                  {!searchLoading ? (
                    <Stack divider={<Divider flexItem />}>
                      {products.map((product) => {
                        const stock = Number(product.stock);
                        const disabled = stock <= 0;

                        return (
                          <ButtonBase
                            key={product.id}
                            onClick={() => addOrIncrementLine(product)}
                            disabled={disabled}
                            sx={{
                              width: "100%",
                              justifyContent: "space-between",
                              alignItems: "center",
                              px: 2,
                              py: 1.5,
                              textAlign: "left",
                              opacity: disabled ? 0.55 : 1,
                            }}
                          >
                            <Stack spacing={0.5} alignItems="flex-start">
                              <Typography fontWeight={700}>{product.name}</Typography>
                              <Typography color="text.secondary" variant="body2">
                                SKU {product.sku}
                              </Typography>
                            </Stack>

                            <Stack spacing={0.75} alignItems="flex-end">
                              <Typography fontWeight={800} variant="h6">
                                {currency(Number(product.default_price))}
                              </Typography>
                              {disabled ? (
                                <Chip size="small" label="Sin stock" color="default" />
                              ) : (
                                stockChip(stock)
                              )}
                            </Stack>
                          </ButtonBase>
                        );
                      })}
                    </Stack>
                  ) : null}
                </Paper>
              ) : null}
            </Box>
          </ClickAwayListener>

          <Paper
            sx={{
              p: 2.5,
              border: "1px solid rgba(148, 163, 184, 0.14)",
              background:
                "linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(15, 23, 42, 0.96) 100%)",
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Carrito
                </Typography>
                {statusBadge(`${itemCount} artículos`, "sky")}
              </Stack>

              {lines.length === 0 ? (
                <Alert severity="info">Aún no agregas productos al carrito.</Alert>
              ) : (
                <Stack spacing={1.5}>
                  {lines.map((line, index) => {
                    const stock = Number(line.product.stock);
                    const lineSubtotal = line.qty * line.unitPrice;
                    const lineDiscount = lineSubtotal * (line.discountPct / 100);
                    const lineTotal = lineSubtotal - lineDiscount;

                    return (
                      <Paper
                        key={line.product.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2.5,
                          borderColor: "rgba(148, 163, 184, 0.16)",
                          background:
                            "linear-gradient(180deg, rgba(30, 41, 59, 0.44) 0%, rgba(15, 23, 42, 0.42) 100%)",
                        }}
                      >
                        <Stack spacing={1.25}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                            <Stack spacing={0.5}>
                              <Typography fontWeight={700}>{line.product.name}</Typography>
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                {stockChip(stock)}
                                <Typography color="text.secondary" variant="body2">
                                  Unitario {currency(line.unitPrice)}
                                </Typography>
                              </Stack>
                            </Stack>

                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography fontWeight={800}>{currency(lineTotal)}</Typography>
                              <IconButton
                                aria-label={`Eliminar ${line.product.name}`}
                                onClick={() => removeLine(line.product.id)}
                                sx={{ color: "error.main" }}
                              >
                                <DeleteOutlineRoundedIcon />
                              </IconButton>
                            </Stack>
                          </Stack>

                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.25}
                            alignItems={{ sm: "center" }}
                            justifyContent="space-between"
                          >
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <IconButton
                                aria-label={`Reducir cantidad de ${line.product.name}`}
                                onClick={() => setLineQty(index, line.qty - 1)}
                                color="primary"
                              >
                                <RemoveRoundedIcon />
                              </IconButton>
                              <TextField
                                size="small"
                                label="Cant."
                                type="number"
                                value={line.qty}
                                onChange={(event) => setLineQty(index, Number(event.target.value))}
                                sx={{ width: 96 }}
                              />
                              <IconButton
                                aria-label={`Agregar cantidad de ${line.product.name}`}
                                onClick={() => setLineQty(index, line.qty + 1)}
                                color="primary"
                                disabled={line.qty >= stock}
                              >
                                <AddRoundedIcon />
                              </IconButton>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center">
                              <TextField
                                size="small"
                                label="Precio"
                                type="number"
                                value={line.unitPrice}
                                onChange={(event) => updateLine(index, { unitPrice: Number(event.target.value) })}
                                sx={{ width: 120 }}
                              />
                              <TextField
                                size="small"
                                label="Desc %"
                                type="number"
                                value={line.discountPct}
                                onChange={(event) => updateLine(index, { discountPct: Number(event.target.value) })}
                                sx={{ width: 110 }}
                              />
                            </Stack>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Paper>

          <Paper
            sx={{
              p: 2.5,
              border: "1px solid rgba(148, 163, 184, 0.14)",
              background:
                "linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(15, 23, 42, 0.96) 100%)",
            }}
          >
            <Button
              onClick={() => setShowAdvanced((prev) => !prev)}
              endIcon={
                <ExpandMoreRoundedIcon
                  sx={{
                    transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              }
            >
              Opciones avanzadas
            </Button>

            <Collapse in={showAdvanced}>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Autorización admin
                </Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField
                    label="Admin username"
                    value={overrideUser}
                    onChange={(event) => setOverrideUser(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Admin password"
                    type="password"
                    value={overridePass}
                    onChange={(event) => setOverridePass(event.target.value)}
                    fullWidth
                  />
                </Stack>
                <TextField
                  label="Motivo override"
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                  fullWidth
                />
              </Stack>
            </Collapse>
          </Paper>
        </Stack>

        <Paper
          sx={{
            p: 2.5,
            borderRadius: 3,
            position: { lg: "sticky" },
            top: { lg: 24 },
            border: "1px solid rgba(16, 185, 129, 0.16)",
            background:
              "radial-gradient(circle at top right, rgba(16, 185, 129, 0.14), transparent 30%), linear-gradient(180deg, rgba(17, 24, 39, 0.99) 0%, rgba(15, 23, 42, 0.98) 100%)",
            boxShadow: "0 20px 48px rgba(2, 6, 23, 0.24)",
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" sx={{ color: "#a7f3d0", fontWeight: 800, letterSpacing: "0.08em" }}>
                Cierre de caja
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Cuenta
              </Typography>
            </Box>

            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography fontWeight={700}>{currency(subtotal)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary">Descuento</Typography>
                <Typography fontWeight={700}>{currency(discount)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary">Productos</Typography>
                <Typography fontWeight={700}>{itemCount}</Typography>
              </Stack>
            </Stack>

            <Divider />

            <Paper
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: "1px solid rgba(16, 185, 129, 0.2)",
                background:
                  "linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(6, 78, 59, 0.14) 100%)",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Total
                </Typography>
                <Typography variant="h4" fontWeight={900}>
                  {currency(total)}
                </Typography>
              </Stack>
            </Paper>

            <Typography color="text.secondary" variant="body2">
              Puedes registrar cliente para reutilizar su saldo a favor o convertir este carrito en un apartado.
            </Typography>

            <Stack spacing={1.5}>
              <TextField
                label="Teléfono del cliente"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="9991234567"
                fullWidth
              />
              <TextField
                label="Nombre del cliente"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Opcional para venta, obligatorio para apartado"
                fullWidth
              />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary" variant="body2">
                  Saldo a favor disponible
                </Typography>
                <Typography fontWeight={800}>
                  {customerLookupLoading ? "Buscando..." : currency(customerCreditBalance)}
                </Typography>
              </Stack>
            </Stack>

            <Button
              variant="contained"
              onClick={openCheckout}
              disabled={lines.length === 0}
              sx={{
                mt: 1,
                py: 1.75,
                borderRadius: 3,
                fontSize: "1.05rem",
                fontWeight: 800,
                background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
                boxShadow: "0 14px 28px rgba(22, 163, 74, 0.18)",
                "&:hover": {
                  background: "linear-gradient(135deg, #166534 0%, #15803d 100%)",
                },
              }}
            >
              Cobrar: {currency(total)}
            </Button>

            <Button
              variant="outlined"
              onClick={openLayaway}
              disabled={lines.length === 0}
              sx={{
                borderRadius: 3,
                py: 1.4,
                fontWeight: 800,
                borderColor: "rgba(56, 189, 248, 0.3)",
                color: "#bae6fd",
                "&:hover": {
                  borderColor: "rgba(56, 189, 248, 0.45)",
                  backgroundColor: "rgba(56, 189, 248, 0.08)",
                },
              }}
            >
              Crear apartado
            </Button>
          </Stack>
        </Paper>
      </Box>

      <Dialog
        open={checkoutOpen}
        onClose={() => {
          if (!submitting) {
            resetCheckoutState();
          }
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: "1px solid rgba(56, 189, 248, 0.14)",
            background:
              "radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 30%), linear-gradient(180deg, rgba(17, 24, 39, 0.99) 0%, rgba(15, 23, 42, 0.98) 100%)",
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
            pb: 2,
          }}
        >
          <Stack spacing={0.35}>
            <Typography variant="overline" sx={{ color: "#bae6fd", fontWeight: 800, letterSpacing: "0.08em" }}>
              Checkout
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Cobrar venta
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: "1px solid rgba(16, 185, 129, 0.2)",
                background:
                  "linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(6, 78, 59, 0.14) 100%)",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary" variant="body2">
                  Total a cobrar
                </Typography>
                <Typography variant="h5" fontWeight={900}>
                  {currency(total)}
                </Typography>
              </Stack>
            </Paper>

            <TextField
              label="Teléfono del cliente"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="Opcional"
              fullWidth
            />

            <TextField
              label="Nombre del cliente"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Se autocompleta si ya existe"
              fullWidth
            />

            <TextField
              label="Aplicar saldo a favor"
              value={creditToApply}
              onChange={(event) => setCreditToApply(toMoneyInput(event.target.value))}
              placeholder="0.00"
              fullWidth
              helperText={`Disponible: ${currency(customerCreditBalance)} · Restante: ${currency(remainingAfterCredit)}`}
            />

            <TextField
              select
              label="Forma de pago"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              fullWidth
              disabled={remainingAfterCredit <= 0}
            >
              <MenuItem value="CASH">Efectivo</MenuItem>
              <MenuItem value="CARD">Tarjeta</MenuItem>
            </TextField>

            {paymentMethod === "CASH" && remainingAfterCredit > 0 ? (
              <Stack spacing={1.5}>
                <TextField
                  label="Cantidad entregada por el cliente"
                  value={cashReceived}
                  onChange={(event) => setCashReceived(toMoneyInput(event.target.value))}
                  placeholder="0.00"
                  fullWidth
                />

                <Typography color="text.secondary" variant="body2">
                  Sugerencias rápidas
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  {cashSuggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outlined"
                      onClick={() => setCashReceived(suggestion.toFixed(2))}
                      sx={{ justifyContent: "space-between" }}
                      fullWidth
                    >
                      {currency(suggestion)}
                    </Button>
                  ))}
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography color="text.secondary" variant="body2">
                    Cambio estimado
                  </Typography>
                  <Typography fontWeight={800}>{currency(previewChange)}</Typography>
                </Stack>
              </Stack>
            ) : null}

            {paymentMethod === "CARD" && remainingAfterCredit > 0 ? (
              <Stack spacing={1.5}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useInstallments}
                      onChange={(event) => setUseInstallments(event.target.checked)}
                      disabled={cardPlansQuery.isLoading || installmentPlans.length === 0}
                    />
                  }
                  label="Meses sin intereses"
                />

                {useInstallments ? (
                  installmentPlans.length > 0 ? (
                    <TextField
                      select
                      label="Plan MSI"
                      value={selectedInstallmentPlanId}
                      onChange={(event) => setSelectedInstallmentPlanId(event.target.value)}
                      fullWidth
                    >
                      {installmentPlans.map((plan) => (
                        <MenuItem key={plan.id} value={plan.id}>
                          {plan.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <Alert severity="warning">No hay planes MSI activos configurados.</Alert>
                  )
                ) : null}

                {cardPlansQuery.isError ? (
                  <Alert severity="error">No fue posible cargar los planes de comisión de tarjeta.</Alert>
                ) : null}

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography color="text.secondary" variant="body2">
                    Comisión estimada
                  </Typography>
                  <Typography fontWeight={800}>
                    {currency(estimatedCommission)} ({(Number(selectedCardPlan?.commission_rate ?? 0) * 100).toFixed(2)}%)
                  </Typography>
                </Stack>
              </Stack>
            ) : null}

            <Paper
              sx={{
                p: 1.75,
                borderRadius: 2,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                background: "rgba(15, 23, 42, 0.58)",
              }}
            >
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ color: "#bae6fd", fontWeight: 800 }}>
                  Utilidad neta estimada (preview)
                </Typography>

                {profitabilityPreviewQuery.isLoading ? (
                  <Typography variant="body2" color="text.secondary">
                    Calculando preview...
                  </Typography>
                ) : null}

                {profitabilityPreviewQuery.isError ? (
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    El preview de rentabilidad no está disponible todavía en backend.
                  </Alert>
                ) : null}

                {profitabilityPreviewQuery.data ? (
                  <>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Costo operativo ({(Number(profitabilityPreviewQuery.data.operating_cost_rate_snapshot) * 100).toFixed(2)}%)
                      </Typography>
                      <Typography variant="body2" fontWeight={800}>
                        {currency(Number(profitabilityPreviewQuery.data.operating_cost_amount))}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {rateSourceLabel(profitabilityPreviewQuery.data.operating_cost_rate_source)}
                    </Typography>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Comisión
                      </Typography>
                      <Typography variant="body2" fontWeight={800}>
                        {currency(Number(profitabilityPreviewQuery.data.commission_amount))}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Utilidad neta total
                      </Typography>
                      <Typography variant="body2" fontWeight={800}>
                        {currency(Number(profitabilityPreviewQuery.data.net_profit_total))}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Split inversionistas
                      </Typography>
                      <Typography variant="body2" fontWeight={800}>
                        {currency(Number(profitabilityPreviewQuery.data.investor_profit_total))}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Split tienda
                      </Typography>
                      <Typography variant="body2" fontWeight={800}>
                        {currency(Number(profitabilityPreviewQuery.data.store_profit_total))}
                      </Typography>
                    </Stack>
                  </>
                ) : null}
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetCheckoutState} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleCheckoutConfirm}
            disabled={submitting}
            variant="contained"
            sx={{
              fontWeight: 800,
              background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #166534 0%, #15803d 100%)",
              },
            }}
          >
            {submitting ? "Procesando..." : `Confirmar cobro ${currency(total)}`}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={layawayOpen}
        onClose={() => {
          if (!layawaySubmitting) {
            setLayawayOpen(false);
          }
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: "1px solid rgba(56, 189, 248, 0.14)",
            background:
              "radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 30%), linear-gradient(180deg, rgba(17, 24, 39, 0.99) 0%, rgba(15, 23, 42, 0.98) 100%)",
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
            pb: 2,
          }}
        >
          <Stack spacing={0.35}>
            <Typography variant="overline" sx={{ color: "#bae6fd", fontWeight: 800, letterSpacing: "0.08em" }}>
              Reserva
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Crear apartado
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: "1px solid rgba(56, 189, 248, 0.2)",
                background:
                  "linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(14, 116, 144, 0.12) 100%)",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary" variant="body2">
                  Total del apartado
                </Typography>
                <Typography variant="h5" fontWeight={900}>
                  {currency(total)}
                </Typography>
              </Stack>
            </Paper>

            <TextField
              label="Teléfono del cliente"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              required
              fullWidth
            />

            <TextField
              label="Nombre del cliente"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              required
              fullWidth
            />

            <TextField
              label="Anticipo inicial"
              value={layawayDeposit}
              onChange={(event) => setLayawayDeposit(toMoneyInput(event.target.value))}
              helperText={`Sugerido (30%): ${currency(total * 0.3)}`}
              fullWidth
            />

            <TextField
              label="Fecha límite"
              type="date"
              value={layawayExpiresAt}
              onChange={(event) => setLayawayExpiresAt(event.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Notas"
              value={layawayNotes}
              onChange={(event) => setLayawayNotes(event.target.value)}
              fullWidth
              multiline
              minRows={2}
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography color="text.secondary" variant="body2">
                Saldo pendiente estimado
              </Typography>
              <Typography fontWeight={800}>{currency(Math.max(total - Number(layawayDeposit || 0), 0))}</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLayawayOpen(false)} disabled={layawaySubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleLayawayConfirm} disabled={layawaySubmitting} variant="contained">
            {layawaySubmitting ? "Guardando..." : "Confirmar apartado"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: "1px solid rgba(16, 185, 129, 0.14)",
            background:
              "radial-gradient(circle at top right, rgba(16, 185, 129, 0.12), transparent 30%), linear-gradient(180deg, rgba(17, 24, 39, 0.99) 0%, rgba(15, 23, 42, 0.98) 100%)",
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
            pb: 2,
          }}
        >
          <Stack spacing={0.35}>
            <Typography variant="overline" sx={{ color: "#a7f3d0", fontWeight: 800, letterSpacing: "0.08em" }}>
              Operación confirmada
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Venta completada
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Alert severity="success">La venta quedó confirmada correctamente.</Alert>

            <Paper
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: "1px solid rgba(16, 185, 129, 0.2)",
                background:
                  "linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(6, 78, 59, 0.14) 100%)",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography color="text.secondary">Cambio a entregar</Typography>
                <Typography variant="h5" fontWeight={900}>
                  {currency(changeDue)}
                </Typography>
              </Stack>
            </Paper>

            <Divider />

            <Typography color="text.secondary" variant="body2">
              Resumen
            </Typography>
            <Typography>ID: {completedSale?.id}</Typography>
            <Typography>Total: {completedSale ? currency(Number(completedSale.total)) : currency(0)}</Typography>
            <Typography>Estado: {completedSale?.status ?? "CONFIRMED"}</Typography>
            <Typography>Artículos: {completedItemCount}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSuccessOpen(false)}
            variant="contained"
            sx={{
              fontWeight: 800,
              background: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #166534 0%, #15803d 100%)",
              },
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
