"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Pagination,
  Paper,
  Select,
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

import { PageHeader } from "@/components/common/page-header";
import { ApiError } from "@/lib/api/errors";
import type { InvestorAssignmentItem, InvestorLedgerEntry, InvestorLedgerEntryType, InvestorLedgerFilters } from "@/lib/types/investors";
import { investorsService } from "@/modules/investors/services/investors.service";
import { formatCurrency, formatDateTime } from "@/modules/products/utils";

const pageSize = 20;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function entryTypeLabel(entryType: InvestorLedgerEntryType) {
  switch (entryType) {
    case "CAPITAL_DEPOSIT":
      return "Deposito";
    case "CAPITAL_WITHDRAWAL":
      return "Retiro";
    case "CAPITAL_TO_INVENTORY":
      return "Compra de inventario";
    case "INVENTORY_TO_CAPITAL":
      return "Recuperacion de capital";
    case "PROFIT_SHARE":
      return "Utilidad";
    case "REINVESTMENT":
      return "Reinversion";
    default:
      return entryType;
  }
}

function formatReference(entry: InvestorLedgerEntry) {
  return `${entry.reference_type} - ${entry.reference_id}`;
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

export function InvestorSelfPage() {
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [draftEntryType, setDraftEntryType] = useState<InvestorLedgerEntryType | "">("");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<InvestorLedgerFilters>({});

  const investorQuery = useQuery({
    queryKey: ["investor-me"],
    queryFn: () => investorsService.getMyInvestor(),
  });

  const investorId = investorQuery.data?.id;

  const assignmentsQuery = useQuery({
    queryKey: ["investor-self-assignments", investorId, assignmentsPage],
    queryFn: () => investorsService.listMyInvestorAssignments({ investorId, page: assignmentsPage }),
    enabled: Boolean(investorId),
  });

  const ledgerQuery = useQuery({
    queryKey: ["investor-self-ledger", ledgerPage, appliedFilters],
    queryFn: () => investorsService.getMyInvestorLedger({ page: ledgerPage, ...appliedFilters }),
  });

  const investor = investorQuery.data;
  const ledgerEntries = ledgerQuery.data?.results ?? [];
  const ledgerTotals = ledgerQuery.data?.totals;
  const hasActiveFilters = Boolean(appliedFilters.entry_type || appliedFilters.date_from || appliedFilters.date_to);
  const assignmentsTotalPages = Math.max(1, Math.ceil((assignmentsQuery.data?.count ?? 0) / pageSize));
  const ledgerTotalPages = Math.max(1, Math.ceil((ledgerQuery.data?.count ?? 0) / pageSize));

  const sortedAssignments = useMemo(() => {
    const assignments = assignmentsQuery.data?.results ?? [];
    return [...assignments].sort((left, right) => {
      const leftInStock = hasAvailableStock(left) ? 1 : 0;
      const rightInStock = hasAvailableStock(right) ? 1 : 0;

      if (leftInStock !== rightInStock) {
        return rightInStock - leftInStock;
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
  }, [assignmentsQuery.data?.results]);

  const baseError = investorQuery.isError ? getErrorMessage(investorQuery.error, "No fue posible cargar tu perfil de inversionista.") : null;
  const assignmentsQueryError = assignmentsQuery.error;
  const isAssignmentsUnavailable =
    assignmentsQueryError instanceof ApiError &&
    (assignmentsQueryError.status === 403 || assignmentsQueryError.status === 404 || assignmentsQueryError.status === 405);
  const assignmentsError = assignmentsQuery.isError && !isAssignmentsUnavailable
    ? getErrorMessage(assignmentsQuery.error, "No fue posible cargar tus productos asignados.")
    : null;
  const ledgerError = ledgerQuery.isError ? getErrorMessage(ledgerQuery.error, "No fue posible cargar tus movimientos.") : null;

  function applyLedgerFilters() {
    setLedgerPage(1);
    setAppliedFilters({
      entry_type: draftEntryType || undefined,
      date_from: draftDateFrom || undefined,
      date_to: draftDateTo || undefined,
    });
  }

  function clearLedgerFilters() {
    setDraftEntryType("");
    setDraftDateFrom("");
    setDraftDateTo("");
    setLedgerPage(1);
    setAppliedFilters({});
  }

  if (investorQuery.isLoading && !investor) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!investor) {
    return <Alert severity="error">{baseError ?? "No fue posible encontrar tu perfil de inversionista."}</Alert>;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        title={`Inversionista: ${investor.display_name}`}
        description="Consulta tus metricas, movimientos y productos asignados. Esta vista es solo lectura."
      />

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

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Productos asignados</Typography>
          {isAssignmentsUnavailable ? (
            <Alert severity="warning">
              Tu backend actual no expone asignaciones de inventario para el inversionista autenticado.
              Se requiere habilitar un endpoint de solo lectura para mostrar esta tabla.
            </Alert>
          ) : null}
          {assignmentsError ? <Alert severity="error">{assignmentsError}</Alert> : null}
          {assignmentsQuery.isLoading ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : null}
          {!assignmentsQuery.isLoading && !isAssignmentsUnavailable && !assignmentsError && sortedAssignments.length === 0 ? (
            <Alert severity="info">Todavia no tienes productos asignados.</Alert>
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
                            <Chip
                              label={status.label}
                              size="small"
                              color={status.color}
                              variant={status.label === "En stock" ? "filled" : "outlined"}
                            />
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

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap" alignItems="flex-end">
            <Select
              size="small"
              displayEmpty
              value={draftEntryType}
              onChange={(event) => setDraftEntryType(event.target.value as InvestorLedgerEntryType | "")}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="">Todos los tipos</MenuItem>
              <MenuItem value="CAPITAL_DEPOSIT">Deposito</MenuItem>
              <MenuItem value="CAPITAL_WITHDRAWAL">Retiro</MenuItem>
              <MenuItem value="CAPITAL_TO_INVENTORY">Compra de inventario</MenuItem>
              <MenuItem value="INVENTORY_TO_CAPITAL">Recuperacion de capital</MenuItem>
              <MenuItem value="PROFIT_SHARE">Utilidad</MenuItem>
              <MenuItem value="REINVESTMENT">Reinversion</MenuItem>
            </Select>
            <TextField
              size="small"
              label="Desde"
              type="date"
              value={draftDateFrom}
              onChange={(event) => setDraftDateFrom(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 155 }}
            />
            <TextField
              size="small"
              label="Hasta"
              type="date"
              value={draftDateTo}
              onChange={(event) => setDraftDateTo(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 155 }}
            />
            <Button variant="contained" size="small" onClick={applyLedgerFilters} disabled={ledgerQuery.isFetching}>
              Buscar
            </Button>
            {hasActiveFilters ? (
              <Button variant="outlined" size="small" onClick={clearLedgerFilters}>
                Limpiar
              </Button>
            ) : null}
          </Stack>

          {hasActiveFilters && ledgerTotals && !ledgerQuery.isFetching ? (
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Capital (periodo)
                </Typography>
                <Typography fontWeight={700} color={Number(ledgerTotals.capital_total) >= 0 ? "success.main" : "error.main"}>
                  {formatCurrency(ledgerTotals.capital_total)}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Inventario (periodo)
                </Typography>
                <Typography fontWeight={700} color={Number(ledgerTotals.inventory_total) >= 0 ? "success.main" : "error.main"}>
                  {formatCurrency(ledgerTotals.inventory_total)}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Utilidad (periodo)
                </Typography>
                <Typography fontWeight={700} color={Number(ledgerTotals.profit_total) >= 0 ? "success.main" : "error.main"}>
                  {formatCurrency(ledgerTotals.profit_total)}
                </Typography>
              </Paper>
            </Box>
          ) : null}

          {ledgerError ? <Alert severity="error">{ledgerError}</Alert> : null}
          {ledgerQuery.isFetching ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : null}
          {!ledgerQuery.isFetching && ledgerEntries.length === 0 ? (
            <Alert severity="info">
              {hasActiveFilters ? "No hay movimientos que coincidan con los filtros." : "Todavia no hay movimientos registrados."}
            </Alert>
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
                            <Typography
                              sx={{
                                color: Number(entry.capital_delta) === 0 ? "text.primary" : visual.tone,
                                fontWeight: Number(entry.capital_delta) === 0 ? 500 : 700,
                              }}
                            >
                              {formatCurrency(entry.capital_delta)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              sx={{
                                color: Number(entry.inventory_delta) === 0 ? "text.primary" : visual.tone,
                                fontWeight: Number(entry.inventory_delta) === 0 ? 500 : 700,
                              }}
                            >
                              {formatCurrency(entry.inventory_delta)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              sx={{
                                color: Number(entry.profit_delta) === 0 ? "text.primary" : visual.tone,
                                fontWeight: Number(entry.profit_delta) === 0 ? 500 : 700,
                              }}
                            >
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
    </Stack>
  );
}
