"use client";

import { Alert, Box, Button, Chip, Divider, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

import { ApiError } from "@/lib/api/errors";
import type { CardType, PaymentMethod, ProductSearchItem, SaleResponse } from "@/lib/types/sales";
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

export default function PosPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductSearchItem[]>([]);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cardType, setCardType] = useState<CardType>("NORMAL");
  const [overrideUser, setOverrideUser] = useState("");
  const [overridePass, setOverridePass] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sale, setSale] = useState<SaleResponse | null>(null);

  const subtotal = lines.reduce((acc, line) => acc + line.qty * line.unitPrice, 0);
  const discount = lines.reduce((acc, line) => acc + line.qty * line.unitPrice * (line.discountPct / 100), 0);
  const total = subtotal - discount;

  async function handleSearch() {
    setErrorMessage(null);
    try {
      const response = await salesService.searchProducts({ q: search });
      setProducts(response.results);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al buscar productos");
    }
  }

  function addLine(product: ProductSearchItem) {
    setLines((prev) => {
      if (prev.some((line) => line.product.id === product.id)) {
        return prev;
      }
      return [
        ...prev,
        {
          product,
          qty: 1,
          unitPrice: Number(product.default_price),
          unitCost: Number(product.default_price) * 0.6,
          discountPct: 0,
        },
      ];
    });
  }

  function updateLine(index: number, patch: Partial<CartLine>) {
    setLines((prev) => prev.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  async function createSale() {
    setErrorMessage(null);

    if (lines.length === 0) {
      setErrorMessage("Debes agregar al menos un producto.");
      return;
    }

    const payloadTotal = Number(total.toFixed(2));
    if (payloadTotal < 0) {
      setErrorMessage("El total no puede ser negativo.");
      return;
    }

    try {
      const payload = {
        lines: lines.map((line) => ({
          product: line.product.id,
          qty: line.qty.toFixed(2),
          unit_price: line.unitPrice.toFixed(2),
          unit_cost: line.unitCost.toFixed(2),
          discount_pct: line.discountPct.toFixed(2),
        })),
        payments: [
          {
            method: paymentMethod,
            amount: payloadTotal.toFixed(2),
            card_type: paymentMethod === "CARD" ? cardType : undefined,
          },
        ],
        override_admin_username: overrideUser || undefined,
        override_admin_password: overridePass || undefined,
        override_reason: overrideReason || undefined,
      };

      const created = await salesService.createSale(payload);
      setSale(created);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible crear la venta.");
      }
    }
  }

  async function confirmSale() {
    if (!sale) {
      return;
    }
    setErrorMessage(null);
    try {
      const confirmed = await salesService.confirmSale(sale.id);
      setSale(confirmed);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No fue posible confirmar.");
    }
  }

  async function voidSale() {
    if (!sale) {
      return;
    }
    setErrorMessage(null);
    try {
      const voided = await salesService.voidSale(sale.id, "Void solicitado desde POS UI");
      setSale(voided);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible anular la venta.");
      }
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">POS</Typography>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper sx={{ p: 2.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            label="Buscar producto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
          />
          <Button variant="contained" onClick={handleSearch}>
            Buscar
          </Button>
        </Stack>

        <Stack spacing={1} sx={{ mt: 2 }}>
          {products.map((product) => (
            <Box key={product.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Stack>
                <Typography>{product.name}</Typography>
                <Typography color="text.secondary" variant="body2">
                  SKU {product.sku} | Stock {product.stock}
                </Typography>
              </Stack>
              <Button variant="outlined" onClick={() => addLine(product)}>
                Agregar
              </Button>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Carrito
        </Typography>
        <Stack spacing={2}>
          {lines.map((line, index) => (
            <Stack key={line.product.id} direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField value={line.product.name} disabled sx={{ flex: 2 }} />
              <TextField
                label="Qty"
                type="number"
                value={line.qty}
                onChange={(event) => updateLine(index, { qty: Number(event.target.value) })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Precio"
                type="number"
                value={line.unitPrice}
                onChange={(event) => updateLine(index, { unitPrice: Number(event.target.value) })}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Descuento %"
                type="number"
                value={line.discountPct}
                onChange={(event) => updateLine(index, { discountPct: Number(event.target.value) })}
                sx={{ flex: 1 }}
              />
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />
        <Stack spacing={1}>
          <Typography>Subtotal: {currency(subtotal)}</Typography>
          <Typography>Descuento: {currency(discount)}</Typography>
          <Typography variant="h6">Total: {currency(total)}</Typography>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mt: 2 }}>
          <TextField
            select
            label="Método de pago"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="CASH">CASH</MenuItem>
            <MenuItem value="CARD">CARD</MenuItem>
          </TextField>
          {paymentMethod === "CARD" ? (
            <TextField
              select
              label="Tipo tarjeta"
              value={cardType}
              onChange={(event) => setCardType(event.target.value as CardType)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="NORMAL">NORMAL</MenuItem>
              <MenuItem value="MSI_3">MSI_3</MenuItem>
            </TextField>
          ) : null}
        </Stack>

        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Override admin (solo si aplica)</Typography>
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

        <Button variant="contained" sx={{ mt: 2 }} onClick={createSale}>
          Crear venta
        </Button>
      </Paper>

      {sale ? (
        <Paper sx={{ p: 2.5 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Resultado de venta</Typography>
            <Typography>ID: {sale.id}</Typography>
            <Typography>
              Estado: <Chip label={sale.status} size="small" />
            </Typography>
            <Typography>Total: {sale.total}</Typography>

            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={confirmSale} disabled={sale.status !== "DRAFT"}>
                Confirmar
              </Button>
              <Button variant="outlined" color="error" onClick={voidSale} disabled={sale.status !== "CONFIRMED"}>
                Void
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
