"use client";

import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { AppBar, Box, Button, IconButton, Toolbar, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { authService } from "@/modules/auth/services/auth.service";
import { useSessionStore } from "@/store/session-store";

interface AppTopbarProps {
  title: string;
  onOpenMobileMenu: () => void;
}

export function AppTopbar({ title, onOpenMobileMenu }: AppTopbarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, clearSession } = useSessionStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
        borderBottom: 1,
        borderColor: "divider",
        backdropFilter: "blur(4px)",
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
