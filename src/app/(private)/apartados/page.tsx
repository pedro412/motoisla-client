"use client";

import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
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
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { layawayService } from "@/modules/layaway/services/layaway.service";
import type { LayawayListItem, LayawayStatus } from "@/lib/types/layaway";

const pageSize = 20;

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusColor(status: LayawayStatus) {
  if (status === "SETTLED") {
    return "success";
  }
  if (status === "REFUNDED") {
    return "info";
  }
  if (status === "EXPIRED") {
    return "error";
  }
  return "warning";
}

function statusLabel(status: LayawayStatus) {
  if (status === "ACTIVE") {
    return "Activo";
  }
  if (status === "SETTLED") {
    return "Liquidado";
  }
  if (status === "EXPIRED") {
    return "Vencido";
  }
  return "Reembolsado";
}

const tableHeaderCellSx = {
  bgcolor: "rgba(148, 163, 184, 0.08)",
  borderBottom: "1px solid",
  borderColor: "divider",
  "& .MuiTypography-root": {
    color: "text.secondary",
    fontSize: "0.78rem",
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
};

export default function LayawayPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | "ACTIVE" | "EXPIRED" | "SETTLED" | "REFUNDED">("");
  const [showSettled, setShowSettled] = useState(false);

  const layawayQuery = useQuery({
    queryKey: ["layaways", page, query, status, showSettled],
    queryFn: () =>
      layawayService.listLayaways({
        page,
        q: query || undefined,
        status: status || undefined,
        exclude_settled: !showSettled && status !== "SETTLED",
      }),
  });

  const totalPages = useMemo(() => {
    if (!layawayQuery.data) {
      return 1;
    }
    return Math.max(1, Math.ceil(layawayQuery.data.count / pageSize));
  }, [layawayQuery.data]);

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Apartados</Typography>

      <Paper sx={{ p: 2.5, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Button
              variant={showSettled ? "outlined" : "contained"}
              onClick={() => {
                setPage(1);
                setShowSettled(false);
                if (status === "SETTLED") {
                  setStatus("");
                }
              }}
              sx={{ minWidth: { md: 180 }, fontWeight: 700 }}
            >
              Ocultar liquidados
            </Button>
            <Button
              variant={showSettled || status === "SETTLED" ? "contained" : "outlined"}
              onClick={() => {
                setPage(1);
                setShowSettled(true);
                setStatus("SETTLED");
              }}
              sx={{ minWidth: { md: 180 }, fontWeight: 700 }}
            >
              Ver liquidados
            </Button>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Buscar por cliente o teléfono"
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            fullWidth
          />
          <TextField
            select
            label="Estatus"
            value={status}
            onChange={(event) => {
              setPage(1);
              const nextStatus = event.target.value as "" | "ACTIVE" | "EXPIRED" | "SETTLED" | "REFUNDED";
              setStatus(nextStatus);
              if (nextStatus === "SETTLED") {
                setShowSettled(true);
              }
            }}
            sx={{ minWidth: { md: 220 } }}
          >
            <MenuItem value="">Operativos</MenuItem>
            <MenuItem value="ACTIVE">Activos</MenuItem>
            <MenuItem value="EXPIRED">Vencidos</MenuItem>
            <MenuItem value="SETTLED">Liquidados</MenuItem>
            <MenuItem value="REFUNDED">Reembolsados</MenuItem>
          </TextField>
          </Stack>
        </Stack>
      </Paper>

      {layawayQuery.isLoading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {layawayQuery.isError ? <Alert severity="error">No fue posible cargar los apartados.</Alert> : null}

      {!layawayQuery.isLoading && layawayQuery.data && layawayQuery.data.results.length === 0 ? (
        <Alert severity="info">Todavía no hay apartados registrados.</Alert>
      ) : null}

      {layawayQuery.data?.results.length ? (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>
                    <Typography variant="caption">Cliente</Typography>
                  </TableCell>
                  <TableCell sx={tableHeaderCellSx}>
                    <Typography variant="caption">Teléfono</Typography>
                  </TableCell>
                  <TableCell sx={tableHeaderCellSx}>
                    <Typography variant="caption">Estatus</Typography>
                  </TableCell>
                  <TableCell sx={tableHeaderCellSx}>
                    <Typography variant="caption">Vence</Typography>
                  </TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>
                    <Typography variant="caption">Total</Typography>
                  </TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>
                    <Typography variant="caption">Pagado</Typography>
                  </TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>
                    <Typography variant="caption">Pendiente</Typography>
                  </TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>
                    <Typography variant="caption">Acción</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {layawayQuery.data.results.map((layaway: LayawayListItem) => (
                  <TableRow key={layaway.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography fontWeight={700} variant="body2">
                        {layaway.customer_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="text.secondary" variant="body2">
                        {layaway.customer_phone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={statusLabel(layaway.status)} size="small" color={statusColor(layaway.status)} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Typography fontWeight={600} variant="body2">
                        {formatDate(layaway.expires_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography fontWeight={800}>{formatMoney(layaway.total)}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography fontWeight={700}>{formatMoney(layaway.amount_paid)}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography fontWeight={800} color={Number(layaway.balance_due) > 0 ? "warning.main" : "success.main"}>
                        {formatMoney(layaway.balance_due)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Button
                        component={Link}
                        href={`/apartados/${layaway.id}`}
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 700, borderRadius: 2 }}
                      >
                        Ver detalle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}

      <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
        <Pagination count={totalPages} page={page} onChange={(_, nextPage) => setPage(nextPage)} color="primary" />
      </Box>
    </Stack>
  );
}
