"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useMemo, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import type {
  Expense,
  ExpenseStatus,
  FixedExpenseTemplate,
  FixedExpenseTemplatePayload,
} from "@/lib/types/expenses";
import { expensesService } from "@/modules/expenses/services/expenses.service";
import { MoneyInput } from "@/components/forms/money-input";

type MonthPreset = "current" | "previous" | "custom";
type FixedDialogMode = "pay" | "edit";

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

function toMonthValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function firstDayFromMonth(month: string) {
  return `${month}-01`;
}

function currentMonth() {
  return toMonthValue(new Date());
}

function previousMonth() {
  const now = new Date();
  return toMonthValue(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

function expenseStatusLabel(status: ExpenseStatus) {
  if (status === "PAID") {
    return "Pagado";
  }
  if (status === "PENDING") {
    return "Pendiente";
  }
  return "Cancelado";
}

function expenseStatusStyles(status: ExpenseStatus) {
  if (status === "PAID") {
    return {
      backgroundColor: "rgba(16, 185, 129, 0.14)",
      borderColor: "rgba(16, 185, 129, 0.25)",
      color: "#a7f3d0",
    };
  }
  if (status === "PENDING") {
    return {
      backgroundColor: "rgba(245, 158, 11, 0.14)",
      borderColor: "rgba(245, 158, 11, 0.25)",
      color: "#fde68a",
    };
  }
  return {
    backgroundColor: "rgba(251, 113, 133, 0.14)",
    borderColor: "rgba(251, 113, 133, 0.24)",
    color: "#fecdd3",
  };
}

function KpiCard({ title, value, subtitle, tone }: { title: string; value: string; subtitle: string; tone: "green" | "amber" | "sky" | "rose" }) {
  const toneMap = {
    green: {
      border: "rgba(16, 185, 129, 0.22)",
      glow: "rgba(16, 185, 129, 0.14)",
      label: "#a7f3d0",
    },
    amber: {
      border: "rgba(245, 158, 11, 0.22)",
      glow: "rgba(245, 158, 11, 0.14)",
      label: "#fde68a",
    },
    sky: {
      border: "rgba(56, 189, 248, 0.22)",
      glow: "rgba(56, 189, 248, 0.14)",
      label: "#bae6fd",
    },
    rose: {
      border: "rgba(251, 113, 133, 0.22)",
      glow: "rgba(251, 113, 133, 0.14)",
      label: "#fecdd3",
    },
  } as const;
  const style = toneMap[tone];

  return (
    <Paper
      sx={{
        p: 2.25,
        height: "100%",
        border: `1px solid ${style.border}`,
        background: `linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, ${style.glow} 100%)`,
      }}
    >
      <Stack spacing={1}>
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: "0.08em", color: style.label }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
          {subtitle}
        </Typography>
      </Stack>
    </Paper>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Paper
      sx={{
        p: 2.5,
        border: "1px solid rgba(148, 163, 184, 0.14)",
        background: "linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(15, 23, 42, 0.96) 100%)",
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
            {subtitle}
          </Typography>
        </Box>
        {children}
      </Stack>
    </Paper>
  );
}

function emptyTemplateForm(): FixedExpenseTemplatePayload {
  return {
    name: "",
    category: "",
    default_amount: "",
    description: "",
    charge_day: 1,
    is_active: true,
    notes: "",
  };
}

function templateToForm(template: FixedExpenseTemplate): FixedExpenseTemplatePayload {
  return {
    name: template.name,
    category: template.category,
    default_amount: template.default_amount,
    description: template.description,
    charge_day: template.charge_day,
    is_active: template.is_active,
    notes: template.notes,
  };
}

function FixedExpenseTemplateDialog({
  open,
  template,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  template: FixedExpenseTemplate | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: FixedExpenseTemplatePayload, templateId?: string) => Promise<void>;
}) {
  const [form, setForm] = useState<FixedExpenseTemplatePayload>(() =>
    template ? templateToForm(template) : emptyTemplateForm(),
  );
  const [error, setError] = useState("");

  async function handleSubmit() {
    try {
      setError("");
      await onSubmit(form, template?.id);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.detail : "No fue posible guardar la plantilla.");
    }
  }

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>{template ? "Editar gasto fijo" : "Nuevo gasto fijo"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="Nombre"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            fullWidth
          />
          <TextField
            label="Categoría"
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            fullWidth
          />
          <MoneyInput
            label="Monto base"
            value={form.default_amount}
            onChange={(value) => setForm((prev) => ({ ...prev, default_amount: value }))}
            fullWidth
          />
          <TextField
            label="Descripción"
            value={form.description ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            fullWidth
          />
          <TextField
            label="Día de cargo"
            type="number"
            value={form.charge_day}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                charge_day: Number(event.target.value || 1),
              }))
            }
            inputProps={{ min: 1, max: 28 }}
            fullWidth
          />
          <TextField
            label="Notas"
            value={form.notes ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={pending}>
          Cerrar
        </Button>
        <Button onClick={handleSubmit} variant="contained" sx={{ fontWeight: 700 }} disabled={pending}>
          {pending ? "Guardando..." : template ? "Guardar cambios" : "Crear plantilla"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [monthPreset, setMonthPreset] = useState<MonthPreset>("current");
  const [customMonth, setCustomMonth] = useState(currentMonth());

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FixedExpenseTemplate | null>(null);

  const [variableDialogOpen, setVariableDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<Expense | null>(null);
  const [variableCategory, setVariableCategory] = useState("");
  const [variableDescription, setVariableDescription] = useState("");
  const [variableAmount, setVariableAmount] = useState("");
  const [variableDate, setVariableDate] = useState(firstDayFromMonth(currentMonth()));
  const [variableError, setVariableError] = useState("");

  const [fixedDialogOpen, setFixedDialogOpen] = useState(false);
  const [fixedDialogMode, setFixedDialogMode] = useState<FixedDialogMode>("pay");
  const [selectedFixedExpense, setSelectedFixedExpense] = useState<Expense | null>(null);
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedDate, setFixedDate] = useState(firstDayFromMonth(currentMonth()));
  const [fixedError, setFixedError] = useState("");

  const selectedMonth = useMemo(() => {
    if (monthPreset === "previous") {
      return previousMonth();
    }
    if (monthPreset === "custom") {
      return customMonth;
    }
    return currentMonth();
  }, [customMonth, monthPreset]);

  const summaryQuery = useQuery({
    queryKey: ["expenses", "summary", selectedMonth],
    queryFn: () => expensesService.getExpenseSummary(selectedMonth),
  });

  const templatesQuery = useQuery({
    queryKey: ["fixed-expense-templates"],
    queryFn: () => expensesService.listFixedExpenseTemplates(),
  });

  const fixedExpensesQuery = useQuery({
    queryKey: ["expenses", "fixed", selectedMonth],
    queryFn: () => expensesService.listExpenses({ month: selectedMonth, expense_type: "FIXED" }),
  });

  const variableExpensesQuery = useQuery({
    queryKey: ["expenses", "variable", selectedMonth],
    queryFn: () => expensesService.listExpenses({ month: selectedMonth, expense_type: "VARIABLE" }),
  });

  const refreshExpenses = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["expenses", "summary", selectedMonth] }),
      queryClient.invalidateQueries({ queryKey: ["expenses", "fixed", selectedMonth] }),
      queryClient.invalidateQueries({ queryKey: ["expenses", "variable", selectedMonth] }),
      queryClient.invalidateQueries({ queryKey: ["sales-report"] }),
    ]);
  };

  const createTemplateMutation = useMutation({
    mutationFn: (payload: FixedExpenseTemplatePayload) => expensesService.createFixedExpenseTemplate(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fixed-expense-templates"] });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FixedExpenseTemplatePayload> }) =>
      expensesService.updateFixedExpenseTemplate(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fixed-expense-templates"] });
    },
  });

  const createVariableMutation = useMutation({
    mutationFn: (payload: { category: string; description: string; amount: string; expense_date: string }) =>
      expensesService.createExpense(payload),
    onSuccess: async () => {
      setVariableDialogOpen(false);
      setEditingVariable(null);
      setVariableCategory("");
      setVariableDescription("");
      setVariableAmount("");
      setVariableDate(firstDayFromMonth(selectedMonth));
      setVariableError("");
      await refreshExpenses();
    },
    onError: (error) => {
      setVariableError(error instanceof ApiError ? error.detail : "No fue posible registrar el gasto.");
    },
  });

  const updateVariableMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { category?: string; description?: string; amount?: string; expense_date?: string; status?: ExpenseStatus } }) =>
      expensesService.updateExpense(id, payload),
    onSuccess: async () => {
      setVariableDialogOpen(false);
      setEditingVariable(null);
      setVariableCategory("");
      setVariableDescription("");
      setVariableAmount("");
      setVariableDate(firstDayFromMonth(selectedMonth));
      setVariableError("");
      await refreshExpenses();
    },
    onError: (error) => {
      setVariableError(error instanceof ApiError ? error.detail : "No fue posible actualizar el gasto.");
    },
  });

  const generateFixedMutation = useMutation({
    mutationFn: () => expensesService.generateFixedExpenses(selectedMonth),
    onSuccess: async () => {
      await refreshExpenses();
    },
  });

  const updateFixedMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { amount?: string; expense_date?: string; due_date?: string; status?: ExpenseStatus } }) =>
      expensesService.updateExpense(id, payload),
    onSuccess: async () => {
      setFixedDialogOpen(false);
      setSelectedFixedExpense(null);
      setFixedAmount("");
      setFixedDate(firstDayFromMonth(selectedMonth));
      setFixedError("");
      await refreshExpenses();
    },
    onError: (error) => {
      setFixedError(error instanceof ApiError ? error.detail : "No fue posible actualizar el gasto fijo.");
    },
  });

  const cancelExpenseMutation = useMutation({
    mutationFn: (expense: Expense) => expensesService.updateExpense(expense.id, { status: "CANCELLED" }),
    onSuccess: async () => {
      await refreshExpenses();
    },
  });

  const summary = summaryQuery.data;
  const templates = templatesQuery.data?.results ?? [];
  const fixedExpenses = fixedExpensesQuery.data?.results ?? [];
  const variableExpenses = variableExpensesQuery.data?.results ?? [];

  const openNewTemplateDialog = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = (template: FixedExpenseTemplate) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const openVariableDialog = (expense?: Expense) => {
    if (expense) {
      setEditingVariable(expense);
      setVariableCategory(expense.category);
      setVariableDescription(expense.description);
      setVariableAmount(expense.amount);
      setVariableDate(expense.expense_date);
    } else {
      setEditingVariable(null);
      setVariableCategory("");
      setVariableDescription("");
      setVariableAmount("");
      setVariableDate(firstDayFromMonth(selectedMonth));
    }
    setVariableError("");
    setVariableDialogOpen(true);
  };

  const openFixedDialog = (expense: Expense, mode: FixedDialogMode) => {
    setSelectedFixedExpense(expense);
    setFixedDialogMode(mode);
    setFixedAmount(expense.amount);
    setFixedDate(mode === "pay" ? expense.expense_date : expense.due_date || expense.expense_date);
    setFixedError("");
    setFixedDialogOpen(true);
  };

  async function saveTemplate(payload: FixedExpenseTemplatePayload, templateId?: string) {
    if (templateId) {
      await updateTemplateMutation.mutateAsync({ id: templateId, payload });
    } else {
      await createTemplateMutation.mutateAsync(payload);
    }
  }

  const saveVariableExpense = () => {
    const payload = {
      category: variableCategory,
      description: variableDescription,
      amount: variableAmount,
      expense_date: variableDate,
    };
    if (editingVariable) {
      updateVariableMutation.mutate({ id: editingVariable.id, payload });
      return;
    }
    createVariableMutation.mutate(payload);
  };

  const saveFixedExpense = () => {
    if (!selectedFixedExpense) {
      return;
    }
    if (fixedDialogMode === "pay") {
      updateFixedMutation.mutate({
        id: selectedFixedExpense.id,
        payload: {
          amount: fixedAmount,
          expense_date: fixedDate,
          status: "PAID",
        },
      });
      return;
    }
    updateFixedMutation.mutate({
      id: selectedFixedExpense.id,
      payload: {
        amount: fixedAmount,
        due_date: fixedDate,
      },
    });
  };

  const cancelExpense = (expense: Expense) => {
    cancelExpenseMutation.mutate(expense);
  };

  const toggleTemplateActive = (template: FixedExpenseTemplate) => {
    updateTemplateMutation.mutate({
      id: template.id,
      payload: { is_active: !template.is_active },
    });
  };

  const loading = summaryQuery.isLoading || templatesQuery.isLoading || fixedExpensesQuery.isLoading || variableExpensesQuery.isLoading;
  const hasError = summaryQuery.isError || templatesQuery.isError || fixedExpensesQuery.isError || variableExpensesQuery.isError;

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 2.25, md: 3 },
          border: "1px solid rgba(56, 189, 248, 0.14)",
          background:
            "radial-gradient(circle at top right, rgba(56, 189, 248, 0.16), transparent 35%), radial-gradient(circle at top left, rgba(16, 185, 129, 0.14), transparent 28%), linear-gradient(135deg, rgba(2, 6, 23, 0.98) 0%, rgba(15, 23, 42, 0.96) 100%)",
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="overline" sx={{ color: "#bae6fd", fontWeight: 800, letterSpacing: "0.08em" }}>
              Control operativo
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Gastos
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 500, mt: 0.5 }}>
              Registra compromisos fijos y gastos del mes para que la utilidad operativa en reportes sea real.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} justifyContent="space-between">
            <ToggleButtonGroup
              value={monthPreset}
              exclusive
              onChange={(_, nextValue: MonthPreset | null) => {
                if (nextValue) {
                  setMonthPreset(nextValue);
                }
              }}
              sx={{
                flexWrap: "wrap",
                gap: 1,
                "& .MuiToggleButtonGroup-grouped": {
                  borderRadius: "12px !important",
                  border: "1px solid rgba(148, 163, 184, 0.16) !important",
                },
              }}
            >
              <ToggleButton value="current" sx={{ px: 2, fontWeight: 700 }}>
                Mes actual
              </ToggleButton>
              <ToggleButton value="previous" sx={{ px: 2, fontWeight: 700 }}>
                Mes pasado
              </ToggleButton>
              <ToggleButton value="custom" sx={{ px: 2, fontWeight: 700 }}>
                Personalizado
              </ToggleButton>
            </ToggleButtonGroup>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              {monthPreset === "custom" ? (
                <TextField
                  label="Mes"
                  type="month"
                  value={customMonth}
                  onChange={(event) => setCustomMonth(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 180 }}
                />
              ) : null}
              <Button
                variant="contained"
                onClick={() => generateFixedMutation.mutate()}
                disabled={generateFixedMutation.isPending}
                sx={{ fontWeight: 700 }}
              >
                Generar gastos fijos del mes
              </Button>
              <Button variant="outlined" onClick={openNewTemplateDialog} sx={{ fontWeight: 700 }}>
                Nuevo gasto fijo
              </Button>
              <Button variant="outlined" onClick={() => openVariableDialog()} sx={{ fontWeight: 700 }}>
                Registrar gasto
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {hasError ? <Alert severity="error">No fue posible cargar la información de gastos.</Alert> : null}
      {generateFixedMutation.isError ? <Alert severity="error">No fue posible generar los gastos fijos del mes.</Alert> : null}

      {loading || !summary ? (
        <Alert severity="info">Cargando resumen de gastos...</Alert>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <KpiCard
              title="Gastos pagados"
              value={formatMoney(summary.actual_paid_total)}
              subtitle="Impactan utilidad real del periodo"
              tone="green"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <KpiCard
              title="Pendiente por pagar"
              value={formatMoney(summary.pending_commitments_total)}
              subtitle={`${summary.fixed_pending_count} compromisos fijos pendientes`}
              tone="amber"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <KpiCard
              title="Fijos pagados"
              value={formatMoney(summary.fixed_paid_total)}
              subtitle={`${summary.fixed_paid_count} gastos fijos liquidados`}
              tone="sky"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <KpiCard
              title="Variables del mes"
              value={formatMoney(summary.variable_paid_total)}
              subtitle={`${summary.variable_paid_count} gastos variables pagados`}
              tone="rose"
            />
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, xl: 5 }}>
          <SectionCard
            title="Plantillas de gastos fijos"
            subtitle="Configura qué debe generarse cada mes y en qué día esperas el cargo"
          >
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Concepto
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Monto
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Cargo
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Acciones
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography sx={{ color: "text.secondary", fontWeight: 600 }}>
                          Aún no hay plantillas registradas.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <Stack spacing={0.35}>
                            <Typography sx={{ fontWeight: 800 }}>{template.name}</Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                              {template.category}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{formatMoney(template.default_amount)}</TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography sx={{ fontWeight: 700 }}>Día {template.charge_day}</Typography>
                            <Chip
                              label={template.is_active ? "Activa" : "Inactiva"}
                              size="small"
                              sx={{
                                alignSelf: "flex-start",
                                borderRadius: 1.5,
                                fontWeight: 700,
                                backgroundColor: template.is_active ? "rgba(16, 185, 129, 0.14)" : "rgba(148, 163, 184, 0.12)",
                                color: template.is_active ? "#a7f3d0" : "#e2e8f0",
                                border: `1px solid ${template.is_active ? "rgba(16, 185, 129, 0.22)" : "rgba(148, 163, 184, 0.18)"}`,
                              }}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end" useFlexGap flexWrap="wrap">
                            <Button size="small" onClick={() => openEditTemplateDialog(template)} sx={{ fontWeight: 700 }}>
                              Editar
                            </Button>
                            <Button size="small" onClick={() => toggleTemplateActive(template)} sx={{ fontWeight: 700 }}>
                              {template.is_active ? "Desactivar" : "Activar"}
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, xl: 7 }}>
          <SectionCard
            title="Gastos fijos del mes"
            subtitle="Generados desde plantillas; aquí se paga, ajusta o cancela cada compromiso"
          >
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Concepto
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Monto
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Fechas
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Estado
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Acciones
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fixedExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography sx={{ color: "text.secondary", fontWeight: 600 }}>
                          No hay gastos fijos generados para {selectedMonth}.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    fixedExpenses.map((expense) => {
                      const statusStyle = expenseStatusStyles(expense.status);
                      return (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <Stack spacing={0.35}>
                              <Typography sx={{ fontWeight: 800 }}>{expense.template_name || expense.description}</Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                {expense.category}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>{formatMoney(expense.amount)}</TableCell>
                          <TableCell>
                            <Stack spacing={0.35}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                Esperado: {formatDate(expense.due_date || expense.expense_date)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                Pagado: {expense.paid_at ? formatDate(expense.expense_date) : "Sin pago"}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={expenseStatusLabel(expense.status)}
                              size="small"
                              sx={{
                                borderRadius: 1.5,
                                fontWeight: 700,
                                backgroundColor: statusStyle.backgroundColor,
                                color: statusStyle.color,
                                border: `1px solid ${statusStyle.borderColor}`,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {expense.status !== "CANCELLED" ? (
                              <Stack direction="row" spacing={1} justifyContent="flex-end" useFlexGap flexWrap="wrap">
                                {expense.status !== "PAID" ? (
                                  <Button size="small" onClick={() => openFixedDialog(expense, "pay")} sx={{ fontWeight: 700 }}>
                                    Marcar pagado
                                  </Button>
                                ) : null}
                                <Button size="small" onClick={() => openFixedDialog(expense, "edit")} sx={{ fontWeight: 700 }}>
                                  Editar
                                </Button>
                                <Button size="small" color="error" onClick={() => cancelExpense(expense)} sx={{ fontWeight: 700 }}>
                                  Cancelar
                                </Button>
                              </Stack>
                            ) : (
                              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                Sin acciones
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <SectionCard
            title="Gastos variables del mes"
            subtitle="Gastos puntuales que sí afectan utilidad real cuando quedan pagados"
          >
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Fecha
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Categoría
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Descripción
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Monto
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Estado
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        Acciones
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {variableExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography sx={{ color: "text.secondary", fontWeight: 600 }}>
                          No hay gastos variables registrados para {selectedMonth}.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    variableExpenses.map((expense) => {
                      const statusStyle = expenseStatusStyles(expense.status);
                      return (
                        <TableRow key={expense.id}>
                          <TableCell sx={{ fontWeight: 700 }}>{formatDate(expense.expense_date)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{expense.category}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{expense.description}</Typography>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>{formatMoney(expense.amount)}</TableCell>
                          <TableCell>
                            <Chip
                              label={expenseStatusLabel(expense.status)}
                              size="small"
                              sx={{
                                borderRadius: 1.5,
                                fontWeight: 700,
                                backgroundColor: statusStyle.backgroundColor,
                                color: statusStyle.color,
                                border: `1px solid ${statusStyle.borderColor}`,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {expense.status !== "CANCELLED" ? (
                              <Stack direction="row" spacing={1} justifyContent="flex-end" useFlexGap flexWrap="wrap">
                                <Button size="small" onClick={() => openVariableDialog(expense)} sx={{ fontWeight: 700 }}>
                                  Editar
                                </Button>
                                <Button size="small" color="error" onClick={() => cancelExpense(expense)} sx={{ fontWeight: 700 }}>
                                  Cancelar
                                </Button>
                              </Stack>
                            ) : (
                              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                Sin acciones
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Grid>
      </Grid>

      <FixedExpenseTemplateDialog
        key={`${templateDialogOpen ? "open" : "closed"}-${editingTemplate?.id ?? "new"}`}
        open={templateDialogOpen}
        template={editingTemplate}
        pending={createTemplateMutation.isPending || updateTemplateMutation.isPending}
        onClose={() => {
          setTemplateDialogOpen(false);
          setEditingTemplate(null);
        }}
        onSubmit={saveTemplate}
      />

      <Dialog open={variableDialogOpen} onClose={() => setVariableDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>{editingVariable ? "Editar gasto del mes" : "Registrar gasto del mes"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {variableError ? <Alert severity="error">{variableError}</Alert> : null}
            <TextField label="Categoría" value={variableCategory} onChange={(event) => setVariableCategory(event.target.value)} fullWidth />
            <TextField
              label="Descripción"
              value={variableDescription}
              onChange={(event) => setVariableDescription(event.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <MoneyInput label="Monto" value={variableAmount} onChange={setVariableAmount} fullWidth />
            <TextField
              label="Fecha"
              type="date"
              value={variableDate}
              onChange={(event) => setVariableDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setVariableDialogOpen(false)}>Cerrar</Button>
          <Button onClick={saveVariableExpense} variant="contained" sx={{ fontWeight: 700 }}>
            {editingVariable ? "Guardar cambios" : "Registrar gasto"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={fixedDialogOpen} onClose={() => setFixedDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {fixedDialogMode === "pay" ? "Marcar gasto fijo como pagado" : "Editar gasto fijo"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {fixedError ? <Alert severity="error">{fixedError}</Alert> : null}
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
              {selectedFixedExpense?.template_name || selectedFixedExpense?.description}
            </Typography>
            <MoneyInput label="Monto" value={fixedAmount} onChange={setFixedAmount} fullWidth />
            <TextField
              label={fixedDialogMode === "pay" ? "Fecha de pago" : "Fecha esperada"}
              type="date"
              value={fixedDate}
              onChange={(event) => setFixedDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setFixedDialogOpen(false)}>Cerrar</Button>
          <Button onClick={saveFixedExpense} variant="contained" sx={{ fontWeight: 700 }}>
            {fixedDialogMode === "pay" ? "Registrar pago" : "Guardar cambios"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
