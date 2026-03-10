"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { purchasesService } from "@/modules/purchases/services/purchases.service";

function formatMoney(value: string | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

export function PurchaseReceiptsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(searchParams.get("created") === "1");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const receiptsQuery = useQuery({
    queryKey: ["purchase-receipts"],
    queryFn: () => purchasesService.getPurchaseReceipts(),
  });

  const createdReceiptId = searchParams.get("receiptId");
  const uploadStatus = searchParams.get("upload");
  const createdMessage = useMemo(() => {
    const baseMessage = createdReceiptId ? `Factura ${createdReceiptId} guardada correctamente.` : "Factura guardada correctamente.";
    if (uploadStatus === "partial") {
      return `${baseMessage} Algunas imagenes no se pudieron asociar; edita esos productos para reintentar.`;
    }
    return baseMessage;
  }, [createdReceiptId, uploadStatus]);

  useEffect(() => {
    if (searchParams.get("created") === "1") {
      void receiptsQuery.refetch();
    }
  }, [receiptsQuery, searchParams]);

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setErrorMessage(null);
    try {
      await purchasesService.deletePurchaseReceipt(deleteTarget.id);
      await receiptsQuery.refetch();
      setSuccessMessage("Factura borrada correctamente.");
      setDeleteTarget(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible borrar la factura.");
      }
    }
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Compras</Typography>
      <Typography color="text.secondary">Consulta tus facturas registradas y crea nuevas compras desde este módulo.</Typography>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Typography variant="h6">Facturas</Typography>
            <Button variant="contained" onClick={() => router.push("/purchases/imports")}>
              Registrar nueva compra
            </Button>
          </Stack>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Factura</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estatus</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Artículos</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(receiptsQuery.data?.results ?? []).map((receipt) => (
                  <TableRow key={receipt.id} hover>
                    <TableCell>{receipt.invoice_number || receipt.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      {receipt.supplier_code} - {receipt.supplier_name}
                    </TableCell>
                    <TableCell>{receipt.invoice_date || "-"}</TableCell>
                    <TableCell>{receipt.status}</TableCell>
                    <TableCell>{formatMoney(receipt.total)}</TableCell>
                    <TableCell>{receipt.lines.length}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button component={Link} href={`/purchases/receipts/${receipt.id}`} size="small" variant="outlined">
                          Ver
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={!receipt.can_delete}
                          onClick={() =>
                            setDeleteTarget({
                              id: receipt.id,
                              label: receipt.invoice_number || receipt.id.slice(0, 8),
                            })
                          }
                        >
                          Borrar
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3500}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => {
          setSnackbarOpen(false);
          router.replace("/purchases");
        }}
      >
        <Alert
          onClose={() => {
            setSnackbarOpen(false);
            router.replace("/purchases");
          }}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {createdMessage}
        </Alert>
      </Snackbar>

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

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar borrado</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget
              ? `Vas a borrar la factura ${deleteTarget.label}. Esta acción revertirá inventario si aplica y no se puede deshacer.`
              : ""}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Borrar factura
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
