"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Box, Breadcrumbs, Button, Link as MuiLink, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import type { ReactNode } from "react";

interface DetailBreadcrumbItem {
  label: string;
  href?: string;
}

interface DetailPageHeaderProps {
  breadcrumbs: DetailBreadcrumbItem[];
  title: string;
  description?: string;
  backLabel?: string;
  backHref?: string;
  onBack?: () => void;
  action?: ReactNode;
  children?: ReactNode;
}

export function DetailPageHeader({
  breadcrumbs,
  title,
  description,
  backLabel = "Volver",
  backHref,
  onBack,
  action,
  children,
}: DetailPageHeaderProps) {
  return (
    <Paper
      sx={{
        p: { xs: 2.5, md: 3.5 },
        borderRadius: 4,
        color: "#e4e4e7",
        background: "linear-gradient(135deg, #09090b 0%, #1a1a1e 45%, #27272a 100%)",
        border: "1px solid rgba(161, 161, 170, 0.18)",
        boxShadow: "0 28px 60px rgba(9, 9, 11, 0.22)",
      }}
    >
      <Stack spacing={2.5}>
        <Breadcrumbs separator="›" sx={{ color: "rgba(228, 228, 231, 0.6)" }}>
          {breadcrumbs.map((item, index) =>
            item.href ? (
              <MuiLink
                key={`${item.label}-${index}`}
                component={Link}
                href={item.href}
                underline="hover"
                sx={{ color: "rgba(191, 219, 254, 0.92)", fontWeight: 700 }}
              >
                {item.label}
              </MuiLink>
            ) : (
              <Typography key={`${item.label}-${index}`} sx={{ color: "rgba(228, 228, 231, 0.88)", fontWeight: 700 }}>
                {item.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Stack spacing={1.25}>
            {backHref ? (
              <Button
                component={Link}
                href={backHref}
                variant="outlined"
                startIcon={<ArrowBackRoundedIcon />}
                sx={{
                  width: "fit-content",
                  borderColor: "rgba(161, 161, 170, 0.22)",
                  color: "#e4e4e7",
                }}
              >
                {backLabel}
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={onBack}
                sx={{
                  width: "fit-content",
                  borderColor: "rgba(161, 161, 170, 0.22)",
                  color: "#e4e4e7",
                }}
              >
                {backLabel}
              </Button>
            )}

            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-0.03em" }}>
                {title}
              </Typography>
              {description ? <Typography sx={{ color: "rgba(228, 228, 231, 0.76)" }}>{description}</Typography> : null}
            </Box>
          </Stack>

          {action ? (
            <Box
              sx={{
                "& .MuiButton-root": {
                  minHeight: 46,
                  px: 2.5,
                  borderRadius: 2.5,
                  fontWeight: 800,
                  boxShadow: "0 12px 24px rgba(9, 9, 11, 0.18)",
                },
              }}
            >
              {action}
            </Box>
          ) : null}
        </Stack>

        {children ? <Box>{children}</Box> : null}
      </Stack>
    </Paper>
  );
}
