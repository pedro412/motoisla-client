"use client";

import { Box, CircularProgress, Toolbar } from "@mui/material";
import { useMemo, useState, type ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar, DRAWER_WIDTH } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { privateNavItems } from "@/config/navigation";
import { authService } from "@/modules/auth/services/auth.service";
import { useSessionStore } from "@/store/session-store";

interface AppShellProps {
  children: ReactNode;
}

function getTitleFromPath(pathname: string): string {
  if (pathname.startsWith("/admin/reports")) {
    return "Admin Reports";
  }

  if (pathname.startsWith("/pos")) {
    return "POS";
  }

  return "MotoIsla";
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, hydrated, setHydrated, setSession } = useSessionStore();

  const title = useMemo(() => getTitleFromPath(pathname), [pathname]);

  useEffect(() => {
    if (hydrated) {
      return;
    }

    authService
      .getSession()
      .then((nextSession) => {
        setSession(nextSession);
      })
      .finally(() => {
        setHydrated(true);
      });
  }, [hydrated, setHydrated, setSession]);

  const navItems = useMemo(() => {
    const role = session.role;
    if (!role) {
      return privateNavItems;
    }

    return privateNavItems.filter((item) => {
      if (!item.requiredRoles || item.requiredRoles.length === 0) {
        return true;
      }
      return item.requiredRoles.includes(role);
    });
  }, [session.role]);

  if (!hydrated) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <AppTopbar title={title} onOpenMobileMenu={() => setMobileOpen(true)} />
      <AppSidebar navItems={navItems} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
