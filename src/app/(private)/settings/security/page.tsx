"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RemoveCircleRoundedIcon from "@mui/icons-material/RemoveCircleRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { authService } from "@/modules/auth/services/auth.service";
import { useSessionStore } from "@/store/session-store";
import { useWorkstationStore } from "@/store/workstation-store";

const TIMEOUT_OPTIONS = [
  { label: "1 minuto", value: 60_000 },
  { label: "2 minutos", value: 120_000 },
  { label: "5 minutos", value: 300_000 },
  { label: "10 minutos", value: 600_000 },
];

export default function SecuritySettingsPage() {
  const { session } = useSessionStore();
  const { inactivityTimeoutMs, setInactivityTimeout, profiles, registerProfile } = useWorkstationStore();

  // Derive hasPIN from workstation profile
  const currentProfile = profiles.find((p) => p.username === session.username);
  const hasPIN = currentProfile?.hasPIN ?? false;

  const [setPinOpen, setSetPinOpen] = useState(false);
  const [removePinOpen, setRemovePinOpen] = useState(false);

  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={600}>
        Seguridad
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          PIN de desbloqueo
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          {hasPIN ? (
            <>
              <CheckCircleRoundedIcon sx={{ color: "#22c55e" }} />
              <Typography variant="body1" sx={{ color: "#94a3b8" }}>
                PIN configurado
              </Typography>
            </>
          ) : (
            <>
              <RemoveCircleRoundedIcon sx={{ color: "#64748b" }} />
              <Typography variant="body1" sx={{ color: "#94a3b8" }}>
                Sin PIN — se usará contraseña para desbloquear
              </Typography>
            </>
          )}
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={() => setSetPinOpen(true)}>
            {hasPIN ? "Cambiar PIN" : "Establecer PIN"}
          </Button>
          {hasPIN && (
            <Button variant="outlined" color="error" onClick={() => setRemovePinOpen(true)}>
              Eliminar PIN
            </Button>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Bloqueo por inactividad
        </Typography>
        <Typography variant="body2" sx={{ color: "#94a3b8", mb: 2 }}>
          La pantalla se bloqueará automáticamente después del tiempo seleccionado.
        </Typography>
        <TextField
          select
          label="Tiempo de inactividad"
          value={inactivityTimeoutMs}
          onChange={(e) => setInactivityTimeout(Number(e.target.value))}
          sx={{ minWidth: 200 }}
        >
          {TIMEOUT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      <SetPinDialog
        open={setPinOpen}
        onClose={() => setSetPinOpen(false)}
        onSuccess={(hasPin) => {
          if (currentProfile && session.username) {
            registerProfile({ ...currentProfile, hasPIN: hasPin });
          }
        }}
      />
      <RemovePinDialog
        open={removePinOpen}
        onClose={() => setRemovePinOpen(false)}
        onSuccess={() => {
          if (currentProfile && session.username) {
            registerProfile({ ...currentProfile, hasPIN: false });
          }
        }}
      />
    </Stack>
  );
}

function SetPinDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (hasPin: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCurrentPassword("");
    setPin("");
    setConfirmPin("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError("El PIN debe ser de 6 dígitos.");
      return;
    }
    if (pin !== confirmPin) {
      setError("Los PINs no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await authService.setPin({ pin, current_password: currentPassword });
      onSuccess(result.has_pin);
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Error al establecer PIN.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Establecer PIN</DialogTitle>
      <DialogContent>
        <Stack spacing={2} component="form" id="set-pin-form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="PIN (6 dígitos)"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            fullWidth
            slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 6 } }}
          />
          <TextField
            label="Confirmar PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            fullWidth
            slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 6 } }}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button type="submit" form="set-pin-form" variant="contained" disabled={submitting}>
          {submitting ? <CircularProgress size={22} color="inherit" /> : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RemovePinDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCurrentPassword("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authService.setPin({ pin: null, current_password: currentPassword });
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Error al eliminar PIN.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Eliminar PIN</DialogTitle>
      <DialogContent>
        <Stack spacing={2} component="form" id="remove-pin-form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            Para desbloquear tendrás que usar tu contraseña completa.
          </Typography>
          <TextField
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
            autoFocus
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button type="submit" form="remove-pin-form" variant="contained" color="error" disabled={submitting}>
          {submitting ? <CircularProgress size={22} color="inherit" /> : "Eliminar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
