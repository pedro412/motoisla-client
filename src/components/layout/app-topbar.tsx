"use client";

import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import NoAccountsRoundedIcon from "@mui/icons-material/NoAccountsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import {
  AppBar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type MouseEvent } from "react";

import { authService } from "@/modules/auth/services/auth.service";
import { useSessionStore } from "@/store/session-store";
import { usePrinterStore } from "@/store/printer-store";
import { useWorkstationStore } from "@/store/workstation-store";

interface AppTopbarProps {
  title: string;
  onOpenMobileMenu: () => void;
}

export function AppTopbar({ title, onOpenMobileMenu }: AppTopbarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, clearSession } = useSessionStore();
  const { status: printerStatus, setStatus: setPrinterStatus } = usePrinterStore();
  const { lock, removeProfile } = useWorkstationStore();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const showPrinterStatus = session.role !== "INVESTOR";

  useEffect(() => {
    if (!showPrinterStatus) return;
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
  }, [setPrinterStatus, showPrinterStatus]);

  function handleMenuOpen(e: MouseEvent<HTMLElement>) {
    setAnchorEl(e.currentTarget);
  }

  function handleMenuClose() {
    setAnchorEl(null);
  }

  function handleLock() {
    handleMenuClose();
    lock();
  }

  async function handleLogout() {
    handleMenuClose();
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

  async function handleLeaveWorkstation() {
    handleMenuClose();
    const username = session.username;
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } finally {
      clearSession();
      queryClient.clear();
      if (username) {
        removeProfile(username);
      }
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
        backgroundColor: "rgba(9, 9, 11, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(161, 161, 170, 0.08)",
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
          {showPrinterStatus ? (
            <Tooltip title={printerStatus === "ok" ? "Impresora lista" : "Impresora no detectada"}>
              <IconButton size="small" sx={{ color: printerStatus === "ok" ? "#22c55e" : "#52525b" }}>
                <PrintRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          <IconButton
            color="inherit"
            onClick={handleMenuOpen}
            disabled={isLoggingOut}
          >
            <PersonRoundedIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem disabled>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {session.username ?? "Usuario"}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLock}>
              <ListItemIcon><LockRoundedIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Bloquear</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Cerrar sesión</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleLeaveWorkstation}>
              <ListItemIcon><NoAccountsRoundedIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Salir de este equipo</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
