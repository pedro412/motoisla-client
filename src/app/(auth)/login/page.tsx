"use client";

import { Alert, Button, CircularProgress, Link as MuiLink, Paper, Stack, TextField, Typography } from "@mui/material";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError } from "@/lib/api/errors";
import { authService } from "@/modules/auth/services/auth.service";
import { useSessionStore } from "@/store/session-store";
import { useWorkstationStore } from "@/store/workstation-store";

export default function LoginPage() {
  const router = useRouter();
  const { setSession, setHydrated } = useSessionStore();
  const registerProfile = useWorkstationStore((s) => s.registerProfile);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const session = await authService.login({ username, password });
      setSession(session);
      setHydrated(true);
      if (session.username && session.role) {
        registerProfile({
          username: session.username,
          firstName: session.firstName ?? "",
          role: session.role,
          hasPIN: session.hasPIN ?? false,
        });
      }
      if (session.role === "ADMIN") {
        router.push("/admin/reports");
      } else if (session.role === "INVESTOR") {
        router.push("/investor");
      } else {
        router.push("/pos");
      }
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.detail);
      } else {
        setErrorMessage("No fue posible iniciar sesión.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
      <Stack spacing={2.5} component="form" onSubmit={onSubmit}>
        <Typography variant="h5" component="h2" fontWeight={600}>
          Iniciar sesión
        </Typography>

        <TextField label="Username" value={username} onChange={(event) => setUsername(event.target.value)} fullWidth />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          fullWidth
        />

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? <CircularProgress size={22} color="inherit" /> : "Entrar"}
        </Button>

        <MuiLink component={NextLink} href="/recuperar-cuenta" variant="body2" sx={{ textAlign: "center" }}>
          ¿Olvidaste tu contraseña?
        </MuiLink>
      </Stack>
    </Paper>
  );
}
