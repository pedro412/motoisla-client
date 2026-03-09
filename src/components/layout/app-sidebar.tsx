"use client";

import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AppNavItem } from "@/types/navigation";

export const DRAWER_WIDTH = 260;

interface AppSidebarProps {
  navItems: AppNavItem[];
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ navItems, mobileOpen, onMobileClose }: AppSidebarProps) {
  const pathname = usePathname();

  const drawerContent = (
    <Box>
      <Toolbar>
        <Typography component="span" variant="h6" fontWeight={700}>
          MotoIsla Admin
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ p: 1 }}>
        {navItems.map((item) => {
          const isSelected = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <ListItemButton
              key={item.key}
              component={Link}
              href={item.href}
              selected={isSelected}
              onClick={onMobileClose}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
