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
  FormControl,
  InputLabel,
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
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/common/page-header";
import { ApiError } from "@/lib/api/errors";
import type { Role } from "@/lib/types/auth";
import type { UserSummary } from "@/lib/types/users";
import { investorsService } from "@/modules/investors/services/investors.service";
import { usersService } from "@/modules/users/services/users.service";

const pageSize = 20;

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  CASHIER: "Cajero",
  INVESTOR: "Inversionista",
};

const ROLE_COLORS: Record<Role, "primary" | "info" | "warning"> = {
  ADMIN: "primary",
  CASHIER: "info",
  INVESTOR: "warning",
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return debouncedValue;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.detail;
  return fallback;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

interface InvestorOption {
  id: string;
  display_name: string;
}

export function UsersListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createRole, setCreateRole] = useState<Role>("CASHIER");
  const [createPassword, setCreatePassword] = useState("");
  const [createInvestor, setCreateInvestor] = useState<InvestorOption | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit dialog state
  const [editUser, setEditUser] = useState<UserSummary | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRole, setEditRole] = useState<Role>("CASHIER");
  const [editInvestor, setEditInvestor] = useState<InvestorOption | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Toggle dialog state
  const [toggleUser, setToggleUser] = useState<UserSummary | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users", debouncedSearch, page],
    queryFn: () => usersService.listUsers({ q: debouncedSearch || undefined, page }),
  });

  const investorsQuery = useQuery({
    queryKey: ["investors-for-select"],
    queryFn: () => investorsService.listInvestors({ page: 1 }),
    staleTime: 60_000,
  });

  const investorOptions: InvestorOption[] = (investorsQuery.data?.results ?? []).map((inv) => ({
    id: inv.id,
    display_name: inv.display_name,
  }));

  const createMutation = useMutation({
    mutationFn: () =>
      usersService.createUser({
        email: createEmail.trim(),
        first_name: createFirstName.trim(),
        last_name: createLastName.trim(),
        role: createRole,
        password: createPassword,
        investor_id: createRole === "INVESTOR" ? createInvestor?.id : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      closeCreateDialog();
    },
    onError: (error) => setCreateError(getErrorMessage(error, "No fue posible crear el usuario.")),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editUser) throw new Error("No user selected");
      return usersService.updateUser(editUser.id, {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        role: editRole,
        investor_id: editRole === "INVESTOR" ? (editInvestor?.id ?? null) : null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      closeEditDialog();
    },
    onError: (error) => setEditError(getErrorMessage(error, "No fue posible actualizar el usuario.")),
  });

  const toggleMutation = useMutation({
    mutationFn: () => {
      if (!toggleUser) throw new Error("No user selected");
      return usersService.updateUser(toggleUser.id, { is_active: !toggleUser.is_active });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setToggleUser(null);
    },
  });

  const totalPages = Math.max(1, Math.ceil((usersQuery.data?.count ?? 0) / pageSize));
  const users = usersQuery.data?.results ?? [];
  const listError = usersQuery.isError ? getErrorMessage(usersQuery.error, "No fue posible cargar los usuarios.") : null;

  function closeCreateDialog() {
    if (createMutation.isPending) return;
    setCreateOpen(false);
    setCreateEmail("");
    setCreateFirstName("");
    setCreateLastName("");
    setCreateRole("CASHIER");
    setCreatePassword("");
    setCreateInvestor(null);
    setCreateError(null);
  }

  function openEditDialog(user: UserSummary) {
    setEditUser(user);
    setEditFirstName(user.first_name);
    setEditLastName(user.last_name);
    setEditRole(user.role);
    const linked = investorOptions.find((inv) => inv.id === user.investor_profile_id);
    setEditInvestor(linked ?? null);
    setEditError(null);
  }

  function closeEditDialog() {
    if (updateMutation.isPending) return;
    setEditUser(null);
    setEditError(null);
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
        <PageHeader title="Usuarios" description="Gestiona cuentas de acceso al sistema." />
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          Nuevo usuario
        </Button>
      </Stack>

      {listError ? <Alert severity="error">{listError}</Alert> : null}

      <Paper sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          <TextField
            label="Buscar usuario"
            placeholder="Nombre o email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            fullWidth
          />

          {usersQuery.isLoading ? (
            <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : null}

          {!usersQuery.isLoading && users.length === 0 ? <Alert severity="info">No se encontraron usuarios.</Alert> : null}

          {users.length > 0 ? (
            <TableContainer>
              <Table sx={{ minWidth: 860 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Último acceso</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{`${user.first_name} ${user.last_name}`.trim() || user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip label={ROLE_LABELS[user.role]} size="small" color={ROLE_COLORS[user.role]} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? "Activo" : "Inactivo"}
                          size="small"
                          color={user.is_active ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell>{formatDate(user.last_login)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button variant="outlined" size="small" onClick={() => openEditDialog(user)}>
                            Editar
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            color={user.is_active ? "warning" : "success"}
                            onClick={() => setToggleUser(user)}
                          >
                            {user.is_active ? "Desactivar" : "Activar"}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : null}

          <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
            <Pagination count={totalPages} page={page} onChange={(_e, p) => setPage(p)} color="primary" />
          </Box>
        </Stack>
      </Paper>

      {/* Create user dialog */}
      <Dialog open={createOpen} onClose={closeCreateDialog} fullWidth maxWidth="sm">
        <DialogTitle>Nuevo usuario</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError ? <Alert severity="error">{createError}</Alert> : null}
            <TextField
              label="Email"
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              fullWidth
              autoFocus
              required
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Nombre"
                value={createFirstName}
                onChange={(e) => setCreateFirstName(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Apellido"
                value={createLastName}
                onChange={(e) => setCreateLastName(e.target.value)}
                fullWidth
                required
              />
            </Stack>
            <FormControl fullWidth>
              <InputLabel>Rol</InputLabel>
              <Select value={createRole} label="Rol" onChange={(e) => setCreateRole(e.target.value as Role)}>
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="CASHIER">Cajero</MenuItem>
                <MenuItem value="INVESTOR">Inversionista</MenuItem>
              </Select>
            </FormControl>
            {createRole === "INVESTOR" ? (
              <Autocomplete
                options={investorOptions}
                getOptionLabel={(opt) => opt.display_name}
                value={createInvestor}
                onChange={(_e, val) => setCreateInvestor(val)}
                renderInput={(params) => <TextField {...params} label="Perfil de inversionista (opcional)" />}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
              />
            ) : null}
            <TextField
              label="Contraseña"
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              fullWidth
              required
              inputProps={{ minLength: 8 }}
              helperText="Mínimo 8 caracteres"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !createEmail || !createFirstName || !createLastName || !createPassword}
          >
            {createMutation.isPending ? "Creando..." : "Crear usuario"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editUser} onClose={closeEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Editar usuario</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {editError ? <Alert severity="error">{editError}</Alert> : null}
            <TextField label="Email" value={editUser?.email ?? ""} fullWidth disabled />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Nombre"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Apellido"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                fullWidth
                required
              />
            </Stack>
            <FormControl fullWidth>
              <InputLabel>Rol</InputLabel>
              <Select value={editRole} label="Rol" onChange={(e) => setEditRole(e.target.value as Role)}>
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="CASHIER">Cajero</MenuItem>
                <MenuItem value="INVESTOR">Inversionista</MenuItem>
              </Select>
            </FormControl>
            {editRole === "INVESTOR" ? (
              <Autocomplete
                options={investorOptions}
                getOptionLabel={(opt) => opt.display_name}
                value={editInvestor}
                onChange={(_e, val) => setEditInvestor(val)}
                renderInput={(params) => <TextField {...params} label="Perfil de inversionista (opcional)" />}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancelar</Button>
          <Button variant="contained" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toggle active dialog */}
      <Dialog open={!!toggleUser} onClose={() => !toggleMutation.isPending && setToggleUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{toggleUser?.is_active ? "Desactivar usuario" : "Activar usuario"}</DialogTitle>
        <DialogContent>
          <Alert severity={toggleUser?.is_active ? "warning" : "info"} sx={{ mt: 1 }}>
            {toggleUser?.is_active
              ? `${toggleUser.first_name} ${toggleUser.last_name} no podrá iniciar sesión después de desactivarlo.`
              : `${toggleUser?.first_name} ${toggleUser?.last_name} podrá volver a iniciar sesión.`}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToggleUser(null)} disabled={toggleMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={toggleUser?.is_active ? "warning" : "success"}
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
          >
            {toggleMutation.isPending ? "Procesando..." : toggleUser?.is_active ? "Desactivar" : "Activar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
