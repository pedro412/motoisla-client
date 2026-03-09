"use client";

import { Alert, Button, CircularProgress, Link as MuiLink, Paper, Stack, TextField, Typography } from "@mui/material";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { authService } from "@/modules/auth/services/auth.service";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const missingParams = !uid || !token;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    try {
      await authService.confirmPasswordReset({ uid, token, new_password: password });
      setSuccess(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible restablecer la contraseña.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (missingParams) {
    return (
      <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
        <Stack spacing={2.5}>
          <Typography variant="h5" component="h2" fontWeight={600}>
            Enlace inválido
          </Typography>
          <Alert severity="error">El enlace de recuperación es inválido o está incompleto.</Alert>
          <MuiLink component={NextLink} href="/recuperar-cuenta" variant="body2" sx={{ textAlign: "center" }}>
            Solicitar nuevo enlace
          </MuiLink>
        </Stack>
      </Paper>
    );
  }

  if (success) {
    return (
      <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
        <Stack spacing={2.5}>
          <Typography variant="h5" component="h2" fontWeight={600}>
            Contraseña actualizada
          </Typography>
          <Alert severity="success">Tu contraseña fue restablecida exitosamente.</Alert>
          <MuiLink component={NextLink} href="/login" variant="body2" sx={{ textAlign: "center" }}>
            Iniciar sesión
          </MuiLink>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
      <Stack spacing={2.5} component="form" onSubmit={onSubmit}>
        <Typography variant="h5" component="h2" fontWeight={600}>
          Nueva contraseña
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ingresa tu nueva contraseña.
        </Typography>

        <TextField
          label="Nueva contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          inputProps={{ minLength: 8 }}
        />
        <TextField
          label="Confirmar contraseña"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          fullWidth
          required
        />

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Button type="submit" variant="contained" size="large" disabled={submitting || !password || !confirmPassword}>
          {submitting ? <CircularProgress size={22} color="inherit" /> : "Restablecer contraseña"}
        </Button>

        <MuiLink component={NextLink} href="/login" variant="body2" sx={{ textAlign: "center" }}>
          Volver a iniciar sesión
        </MuiLink>
      </Stack>
    </Paper>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
