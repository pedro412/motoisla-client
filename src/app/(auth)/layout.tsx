import { Box, Container, Typography } from "@mui/material";
import Image from "next/image";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <Container maxWidth="sm" sx={{ minHeight: "100dvh", py: 8, display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Box
          sx={{
            position: "relative",
            width: { xs: 180, sm: 220 },
            height: { xs: 180, sm: 220 },
            mb: 1.5,
          }}
        >
          <Image
            src="/motoisla-logo-v2.png"
            alt="MotoIsla"
            fill
            sizes="(max-width: 600px) 180px, 220px"
            priority
            style={{ objectFit: "contain" }}
          />
        </Box>
        <Typography component="h1" variant="h4" fontWeight={700}>
          Panel Interno
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
