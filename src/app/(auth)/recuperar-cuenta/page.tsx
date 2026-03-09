"use client";

import { Alert, Button, CircularProgress, Link as MuiLink, Paper, Stack, TextField, Typography } from "@mui/material";
import NextLink from "next/link";
import { FormEvent, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { authService } from "@/modules/auth/services/auth.service";

export default function RecoverAccountPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      await authService.requestPasswordReset({ email });
      setSent(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible enviar la solicitud.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
        <Stack spacing={2.5}>
          <Typography variant="h5" component="h2" fontWeight={600}>
            Revisa tu correo
          </Typography>
          <Alert severity="success">
            Si el email está registrado, recibirás un enlace para restablecer tu contraseña.
          </Alert>
          <MuiLink component={NextLink} href="/login" variant="body2" sx={{ textAlign: "center" }}>
            Volver a iniciar sesión
          </MuiLink>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
      <Stack spacing={2.5} component="form" onSubmit={onSubmit}>
        <Typography variant="h5" component="h2" fontWeight={600}>
          Recuperar cuenta
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
        </Typography>

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
        />

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Button type="submit" variant="contained" size="large" disabled={submitting || !email}>
          {submitting ? <CircularProgress size={22} color="inherit" /> : "Enviar enlace"}
        </Button>

        <MuiLink component={NextLink} href="/login" variant="body2" sx={{ textAlign: "center" }}>
          Volver a iniciar sesión
        </MuiLink>
      </Stack>
    </Paper>
  );
}
