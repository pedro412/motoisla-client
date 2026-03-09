import { createTheme } from "@mui/material/styles";

// Surface elevation scale — all from the same blue-slate hue family
// base: #0f172a → card: #131d2e → elevated (menus/dialogs): #1a2540

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0f172a",
      paper: "#131d2e",
    },
    primary: {
      main: "#38bdf8",
      light: "#7dd3fc",
      dark: "#0284c7",
      contrastText: "#0c1a2e",
    },
    secondary: {
      main: "#a78bfa",
    },
    text: {
      primary: "#f1f5f9",
      secondary: "#94a3b8",
      disabled: "#475569",
    },
    divider: "rgba(148, 163, 184, 0.1)",
    success: {
      main: "#10b981",
      light: "#a7f3d0",
    },
    warning: {
      main: "#f59e0b",
      light: "#fde68a",
    },
    error: {
      main: "#ef4444",
      light: "#fecaca",
    },
    info: {
      main: "#38bdf8",
      light: "#bae6fd",
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: 'var(--font-roboto), "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontWeight: 700 },
    overline: { fontWeight: 700, letterSpacing: "0.1em", fontSize: "0.7rem" },
    button: { fontWeight: 600, textTransform: "none" },
  },
  components: {
    // === PAPER ===
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },

    // === INPUTS ===
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: "rgba(11, 17, 32, 0.45)",
          color: "#f1f5f9",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(148, 163, 184, 0.18)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(148, 163, 184, 0.32)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(56, 189, 248, 0.5)",
            borderWidth: 1,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#64748b",
          "&.Mui-focused": { color: "#7dd3fc" },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1a2540",
          border: "1px solid rgba(148, 163, 184, 0.14)",
        },
        option: {
          color: "#e2e8f0",
          "&.Mui-focused": { backgroundColor: "rgba(56, 189, 248, 0.08) !important" },
          '&[aria-selected="true"]': { backgroundColor: "rgba(56, 189, 248, 0.14) !important" },
        },
        clearIndicator: { color: "#64748b" },
        popupIndicator: { color: "#64748b" },
      },
    },

    // === BUTTONS ===
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
          letterSpacing: 0,
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)",
          boxShadow: "0 1px 8px rgba(56, 189, 248, 0.2)",
          color: "#0c1a2e",
          "&:hover": {
            background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
            boxShadow: "0 2px 12px rgba(56, 189, 248, 0.3)",
          },
        },
        outlinedPrimary: {
          borderColor: "rgba(56, 189, 248, 0.4)",
          "&:hover": {
            borderColor: "rgba(56, 189, 248, 0.6)",
            backgroundColor: "rgba(56, 189, 248, 0.06)",
          },
        },
        outlinedInherit: {
          borderColor: "rgba(148, 163, 184, 0.22)",
          "&:hover": {
            borderColor: "rgba(148, 163, 184, 0.38)",
            backgroundColor: "rgba(148, 163, 184, 0.06)",
          },
        },
        textPrimary: {
          "&:hover": { backgroundColor: "rgba(56, 189, 248, 0.08)" },
        },
        textInherit: {
          color: "#94a3b8",
          "&:hover": { color: "#f1f5f9", backgroundColor: "rgba(148, 163, 184, 0.06)" },
        },
        sizeSmall: {
          fontSize: "0.8125rem",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "&:hover": { backgroundColor: "rgba(148, 163, 184, 0.08)" },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderColor: "rgba(148, 163, 184, 0.16)",
          color: "#94a3b8",
          "&.Mui-selected": {
            color: "#38bdf8",
            backgroundColor: "rgba(56, 189, 248, 0.1)",
            borderColor: "rgba(56, 189, 248, 0.3) !important",
            "&:hover": { backgroundColor: "rgba(56, 189, 248, 0.14)" },
          },
          "&:hover": { backgroundColor: "rgba(148, 163, 184, 0.06)" },
        },
      },
    },

    // === CHIPS ===
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.75rem",
          borderRadius: 6,
        },
      },
    },

    // === NAVIGATION ===
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0f172a",
          backgroundImage: "none",
          borderRight: "1px solid rgba(148, 163, 184, 0.08)",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 2,
          color: "#64748b",
          transition: "color 150ms ease, background-color 150ms ease",
          "& .MuiListItemIcon-root": { color: "#475569" },
          "&:hover": {
            backgroundColor: "rgba(148, 163, 184, 0.07)",
            color: "#cbd5e1",
            "& .MuiListItemIcon-root": { color: "#94a3b8" },
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(56, 189, 248, 0.1)",
            color: "#38bdf8",
            "& .MuiListItemIcon-root": { color: "#38bdf8" },
            "&:hover": { backgroundColor: "rgba(56, 189, 248, 0.14)" },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: { minWidth: 36, color: "#475569" },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontWeight: 500,
          fontSize: "0.875rem",
        },
      },
    },

    // === TABLES ===
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-root": {
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            color: "#64748b",
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          color: "#e2e8f0",
          borderBottom: "1px solid rgba(148, 163, 184, 0.08)",
          backgroundColor: "transparent",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&.MuiTableRow-hover:hover": {
            backgroundColor: "rgba(56, 189, 248, 0.04)",
          },
        },
      },
    },

    // === FEEDBACK ===
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: "1px solid",
        },
        standardError: {
          borderColor: "rgba(239, 68, 68, 0.22)",
          backgroundColor: "rgba(239, 68, 68, 0.07)",
        },
        standardSuccess: {
          borderColor: "rgba(16, 185, 129, 0.22)",
          backgroundColor: "rgba(16, 185, 129, 0.07)",
        },
        standardInfo: {
          borderColor: "rgba(56, 189, 248, 0.22)",
          backgroundColor: "rgba(56, 189, 248, 0.07)",
        },
        standardWarning: {
          borderColor: "rgba(245, 158, 11, 0.22)",
          backgroundColor: "rgba(245, 158, 11, 0.07)",
        },
        filledSuccess: { backgroundColor: "#10b981" },
        filledError: { backgroundColor: "#ef4444" },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1a2540",
          backgroundImage: "none",
          border: "1px solid rgba(148, 163, 184, 0.12)",
        },
      },
    },

    // === MISC ===
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: "rgba(148, 163, 184, 0.1)" },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: "#475569",
          "&.Mui-checked": { color: "#38bdf8" },
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(148, 163, 184, 0.08)",
          "&::after": {
            background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.05), transparent)",
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1a2540",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          color: "#e2e8f0",
          fontSize: "0.75rem",
        },
        arrow: { color: "#1a2540" },
      },
    },
  },
});

export default theme;
