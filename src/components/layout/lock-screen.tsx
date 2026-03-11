"use client";

import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";
import { authService } from "@/modules/auth/services/auth.service";
import { useSessionStore } from "@/store/session-store";
import { useWorkstationStore, type WorkstationProfile } from "@/store/workstation-store";

type Screen = "profiles" | "pin" | "password" | "full-login";

function getInitials(profile: WorkstationProfile): string {
  if (profile.firstName) {
    return profile.firstName.charAt(0).toUpperCase();
  }
  return profile.username.charAt(0).toUpperCase();
}

function getDisplayName(profile: WorkstationProfile): string {
  return profile.firstName || profile.username;
}

function Clock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const time = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <Box sx={{ textAlign: "center", mb: 6 }}>
      <Typography variant="h1" sx={{ fontWeight: 300, color: "#fafafa", fontSize: { xs: "4rem", md: "6rem" }, lineHeight: 1 }}>
        {time}
      </Typography>
      <Typography variant="h6" sx={{ color: "#a1a1aa", textTransform: "capitalize", mt: 1 }}>
        {date}
      </Typography>
    </Box>
  );
}

function PinInput({
  onComplete,
  disabled,
}: {
  onComplete: (pin: string) => void;
  disabled: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (disabled) return;
      const digit = value.replace(/\D/g, "").slice(-1);
      const next = [...digits];
      next[index] = digit;
      setDigits(next);

      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      if (digit && index === 5) {
        const pin = next.join("");
        if (pin.length === 6) {
          onComplete(pin);
        }
      }
    },
    [digits, disabled, onComplete],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (pasted.length === 6) {
        const next = pasted.split("");
        setDigits(next);
        onComplete(pasted);
      }
    },
    [onComplete],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1} justifyContent="center" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <TextField
            key={i}
            inputRef={(el: HTMLInputElement | null) => {
              inputRefs.current[i] = el;
            }}
            value={d ? "\u2022" : ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={disabled}
            slotProps={{
              input: {
                sx: {
                  width: 48,
                  height: 56,
                  textAlign: "center",
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  backgroundColor: "#27272a",
                },
              },
              htmlInput: {
                maxLength: 1,
                inputMode: "numeric",
                style: { textAlign: "center" },
                autoComplete: "off",
              },
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}

export function LockScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setSession, setHydrated, clearSession } = useSessionStore();
  const { profiles, unlock, registerProfile } = useWorkstationStore();

  const [screen, setScreen] = useState<Screen>("profiles");
  const [selectedProfile, setSelectedProfile] = useState<WorkstationProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pinResetKey, setPinResetKey] = useState(0);

  // Full login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Password unlock state
  const [password, setPassword] = useState("");

  const handleSelectProfile = useCallback((profile: WorkstationProfile) => {
    setSelectedProfile(profile);
    setError(null);
    if (profile.hasPIN) {
      setScreen("pin");
    } else {
      setScreen("password");
      setPassword("");
    }
  }, []);

  const handlePinComplete = useCallback(
    async (pin: string) => {
      if (!selectedProfile || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const session = await authService.pinLogin({ username: selectedProfile.username, pin });
        setSession(session);
        setHydrated(true);
        queryClient.clear();
        if (session.username && session.role) {
          registerProfile({
            username: session.username,
            firstName: session.firstName ?? selectedProfile.firstName,
            role: session.role,
            hasPIN: session.hasPIN ?? true,
          });
        }
        unlock();
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "PIN incorrecto.");
        setPinResetKey((k) => k + 1);
      } finally {
        setSubmitting(false);
      }
    },
    [selectedProfile, submitting, setSession, setHydrated, queryClient, registerProfile, unlock],
  );

  const handlePasswordUnlock = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!selectedProfile || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const session = await authService.login({ username: selectedProfile.username, password });
        setSession(session);
        setHydrated(true);
        queryClient.clear();
        if (session.username && session.role) {
          registerProfile({
            username: session.username,
            firstName: session.firstName ?? selectedProfile.firstName,
            role: session.role,
            hasPIN: session.hasPIN ?? false,
          });
        }
        unlock();
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Contraseña incorrecta.");
      } finally {
        setSubmitting(false);
      }
    },
    [selectedProfile, password, submitting, setSession, setHydrated, queryClient, registerProfile, unlock],
  );

  const handleFullLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const session = await authService.login({ username: loginUsername, password: loginPassword });
        setSession(session);
        setHydrated(true);
        queryClient.clear();
        if (session.username && session.role) {
          registerProfile({
            username: session.username,
            firstName: session.firstName ?? "",
            role: session.role,
            hasPIN: session.hasPIN ?? false,
          });
        }
        unlock();
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "No fue posible iniciar sesión.");
      } finally {
        setSubmitting(false);
      }
    },
    [loginUsername, loginPassword, submitting, setSession, setHydrated, queryClient, registerProfile, unlock],
  );

  const handleGoToLogin = useCallback(() => {
    clearSession();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }, [clearSession, queryClient, router]);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Clock />

      {screen === "profiles" && (
        <Box sx={{ textAlign: "center" }}>
          <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap" useFlexGap>
            {profiles.map((profile) => (
              <Box
                key={profile.username}
                onClick={() => handleSelectProfile(profile)}
                sx={{
                  cursor: "pointer",
                  textAlign: "center",
                  p: 2,
                  borderRadius: 2,
                  transition: "background-color 0.2s",
                  "&:hover": { backgroundColor: "rgba(56, 189, 248, 0.08)" },
                }}
              >
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    backgroundColor: "#27272a",
                    color: "#38bdf8",
                    mx: "auto",
                    mb: 1,
                  }}
                >
                  {getInitials(profile)}
                </Avatar>
                <Typography variant="body1" sx={{ color: "#fafafa", fontWeight: 500 }}>
                  {getDisplayName(profile)}
                </Typography>
                <Typography variant="caption" sx={{ color: "#71717a" }}>
                  {profile.role}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Button
            variant="text"
            sx={{ mt: 4, color: "#a1a1aa" }}
            onClick={() => {
              setScreen("full-login");
              setError(null);
            }}
          >
            Iniciar como otro usuario
          </Button>
        </Box>
      )}

      {screen === "pin" && selectedProfile && (
        <Box sx={{ textAlign: "center", maxWidth: 360 }}>
          <Avatar
            sx={{
              width: 72,
              height: 72,
              fontSize: "1.75rem",
              fontWeight: 600,
              backgroundColor: "#27272a",
              color: "#38bdf8",
              mx: "auto",
              mb: 1,
              border: "2px solid #38bdf8",
            }}
          >
            {getInitials(selectedProfile)}
          </Avatar>
          <Typography variant="h6" sx={{ color: "#fafafa", mb: 3 }}>
            {getDisplayName(selectedProfile)}
          </Typography>

          <Typography variant="body2" sx={{ color: "#a1a1aa", mb: 2 }}>
            Ingresa tu PIN
          </Typography>

          <PinInput key={pinResetKey} onComplete={handlePinComplete} disabled={submitting} />

          {error && (
            <Typography variant="body2" color="error" sx={{ mt: 1, textAlign: "center" }}>
              {error}
            </Typography>
          )}

          {submitting && <CircularProgress size={24} sx={{ mt: 2 }} />}

          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
            <Button variant="text" sx={{ color: "#a1a1aa" }} onClick={() => { setScreen("profiles"); setError(null); }}>
              Atrás
            </Button>
            <Button variant="text" sx={{ color: "#a1a1aa" }} onClick={() => { setScreen("password"); setPassword(""); setError(null); }}>
              Usar contraseña
            </Button>
          </Stack>
        </Box>
      )}

      {screen === "password" && selectedProfile && (
        <Box sx={{ textAlign: "center", maxWidth: 360, width: "100%" }}>
          <Avatar
            sx={{
              width: 72,
              height: 72,
              fontSize: "1.75rem",
              fontWeight: 600,
              backgroundColor: "#27272a",
              color: "#38bdf8",
              mx: "auto",
              mb: 1,
              border: "2px solid #38bdf8",
            }}
          >
            {getInitials(selectedProfile)}
          </Avatar>
          <Typography variant="h6" sx={{ color: "#fafafa", mb: 3 }}>
            {getDisplayName(selectedProfile)}
          </Typography>

          <Stack spacing={2} component="form" onSubmit={handlePasswordUnlock}>
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              autoFocus
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" disabled={submitting || !password}>
              {submitting ? <CircularProgress size={22} color="inherit" /> : "Desbloquear"}
            </Button>
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            <Button variant="text" sx={{ color: "#a1a1aa" }} onClick={() => { setScreen("profiles"); setError(null); }}>
              Atrás
            </Button>
            {selectedProfile.hasPIN && (
              <Button variant="text" sx={{ color: "#a1a1aa" }} onClick={() => { setScreen("pin"); setError(null); }}>
                Usar PIN
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {screen === "full-login" && (
        <Box sx={{ textAlign: "center", maxWidth: 360, width: "100%" }}>
          <Typography variant="h6" sx={{ color: "#fafafa", mb: 3 }}>
            Iniciar sesión
          </Typography>

          <Stack spacing={2} component="form" onSubmit={handleFullLogin}>
            <TextField
              label="Usuario"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Contraseña"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" disabled={submitting || !loginUsername || !loginPassword}>
              {submitting ? <CircularProgress size={22} color="inherit" /> : "Entrar"}
            </Button>
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            <Button variant="text" sx={{ color: "#a1a1aa" }} onClick={() => { setScreen("profiles"); setError(null); }}>
              Atrás
            </Button>
            <Button variant="text" sx={{ color: "#a1a1aa" }} onClick={handleGoToLogin}>
              Ir a login completo
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
