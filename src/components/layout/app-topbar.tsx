"use client";

import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import { AppBar, Box, Button, IconButton, Toolbar, Tooltip, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { authService } from "@/modules/auth/services/auth.service";
import { useSessionStore } from "@/store/session-store";
import { usePrinterStore } from "@/store/printer-store";

interface AppTopbarProps {
  title: string;
  onOpenMobileMenu: () => void;
}

export function AppTopbar({ title, onOpenMobileMenu }: AppTopbarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, clearSession } = useSessionStore();
  const { status: printerStatus, setStatus: setPrinterStatus } = usePrinterStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("usb" in navigator)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usb = (navigator as any).usb as { getDevices: () => Promise<unknown[]>; addEventListener: (event: string, handler: () => void) => void; removeEventListener: (event: string, handler: () => void) => void };

    function onConnect() { setPrinterStatus("ok"); }
    function onDisconnect() { setPrinterStatus("idle"); }

    async function checkPrinter() {
      try {
        const devices = await usb.getDevices();
        setPrinterStatus(devices.length > 0 ? "ok" : "idle");
      } catch {
        // WebUSB not authorized yet — leave as idle
      }
    }

    checkPrinter();
    usb.addEventListener("connect", onConnect);
    usb.addEventListener("disconnect", onDisconnect);

    return () => {
      usb.removeEventListener("connect", onConnect);
      usb.removeEventListener("disconnect", onDisconnect);
    };
  }, [setPrinterStatus]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } finally {
      clearSession();
      queryClient.clear();
      router.push("/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
      sx={{
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="abrir menú"
            onClick={onOpenMobileMenu}
            sx={{ display: { md: "none" } }}
          >
            <MenuRoundedIcon />
          </IconButton>
          <Typography component="h1" variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button startIcon={<PersonRoundedIcon />} variant="text" color="inherit">
            {session.username ?? "Usuario"}
          </Button>
          <Tooltip title={printerStatus === "ok" ? "Impresora lista" : "Impresora no detectada"}>
            <IconButton size="small" sx={{ color: printerStatus === "ok" ? "#22c55e" : "#475569" }}>
              <PrintRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            startIcon={<LogoutRoundedIcon />}
            variant="outlined"
            color="inherit"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
