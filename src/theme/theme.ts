import { createTheme } from "@mui/material/styles";

// Surface elevation scale — neutral zinc dark mode
// base: #09090b → card: #18181b → elevated (menus/dialogs): #27272a

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#09090b",
      paper: "#18181b",
    },
    primary: {
      main: "#38bdf8",
      light: "#7dd3fc",
      dark: "#0284c7",
      contrastText: "#09090b",
    },
    secondary: {
      main: "#a78bfa",
    },
    text: {
      primary: "#fafafa",
      secondary: "#a1a1aa",
      disabled: "#52525b",
    },
    divider: "rgba(161, 161, 170, 0.1)",
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
    fontFamily: 'var(--font-inter), "Helvetica", "Arial", sans-serif',
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
          backgroundColor: "rgba(9, 9, 11, 0.45)",
          color: "#fafafa",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(161, 161, 170, 0.18)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(161, 161, 170, 0.32)",
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
          color: "#71717a",
          "&.Mui-focused": { color: "#7dd3fc" },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backgroundColor: "#27272a",
          border: "1px solid rgba(161, 161, 170, 0.14)",
        },
        option: {
          color: "#e4e4e7",
          "&.Mui-focused": { backgroundColor: "rgba(56, 189, 248, 0.08) !important" },
          '&[aria-selected="true"]': { backgroundColor: "rgba(56, 189, 248, 0.14) !important" },
        },
        clearIndicator: { color: "#71717a" },
        popupIndicator: { color: "#71717a" },
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
          backgroundColor: "#0ea5e9",
          boxShadow: "0 1px 8px rgba(56, 189, 248, 0.2)",
          color: "#09090b",
          "&:hover": {
            backgroundColor: "#0284c7",
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
          borderColor: "rgba(161, 161, 170, 0.22)",
          "&:hover": {
            borderColor: "rgba(161, 161, 170, 0.38)",
            backgroundColor: "rgba(161, 161, 170, 0.06)",
          },
        },
        textPrimary: {
          "&:hover": { backgroundColor: "rgba(56, 189, 248, 0.08)" },
        },
        textInherit: {
          color: "#a1a1aa",
          "&:hover": { color: "#fafafa", backgroundColor: "rgba(161, 161, 170, 0.06)" },
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
          "&:hover": { backgroundColor: "rgba(161, 161, 170, 0.08)" },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderColor: "rgba(161, 161, 170, 0.16)",
          color: "#a1a1aa",
          "&.Mui-selected": {
            color: "#38bdf8",
            backgroundColor: "rgba(56, 189, 248, 0.1)",
            borderColor: "rgba(56, 189, 248, 0.3) !important",
            "&:hover": { backgroundColor: "rgba(56, 189, 248, 0.14)" },
          },
          "&:hover": { backgroundColor: "rgba(161, 161, 170, 0.06)" },
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
          backgroundColor: "#09090b",
          backgroundImage: "none",
          borderRight: "1px solid rgba(161, 161, 170, 0.08)",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginBottom: 2,
          color: "#71717a",
          transition: "color 150ms ease, background-color 150ms ease",
          "& .MuiListItemIcon-root": { color: "#52525b" },
          "&:hover": {
            backgroundColor: "rgba(161, 161, 170, 0.07)",
            color: "#d4d4d8",
            "& .MuiListItemIcon-root": { color: "#a1a1aa" },
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
        root: { minWidth: 36, color: "#52525b" },
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
            backgroundColor: "rgba(9, 9, 11, 0.6)",
            color: "#71717a",
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            borderBottom: "1px solid rgba(161, 161, 170, 0.1)",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          color: "#e4e4e7",
          borderBottom: "1px solid rgba(161, 161, 170, 0.08)",
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
          backgroundColor: "#27272a",
          backgroundImage: "none",
          border: "1px solid rgba(161, 161, 170, 0.12)",
        },
      },
    },

    // === MISC ===
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: "rgba(161, 161, 170, 0.1)" },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: "#52525b",
          "&.Mui-checked": { color: "#38bdf8" },
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(161, 161, 170, 0.08)",
          "&::after": {
            background: "linear-gradient(90deg, transparent, rgba(161,161,170,0.05), transparent)",
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#27272a",
          border: "1px solid rgba(161, 161, 170, 0.16)",
          color: "#e4e4e7",
          fontSize: "0.75rem",
        },
        arrow: { color: "#27272a" },
      },
    },
  },
});

export default theme;
