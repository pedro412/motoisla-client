import { Box, Container, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <Container maxWidth="sm" sx={{ minHeight: "100dvh", py: 8, display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 4 }}>
        <Typography component="h1" variant="h4" fontWeight={700}>
          MotoIsla Client
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Inicia sesión para continuar en el panel interno.
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>{children}</Box>

      <Box component="footer" sx={{ mt: 6 }}>
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} MotoIsla.
        </Typography>
      </Box>
    </Container>
  );
}
