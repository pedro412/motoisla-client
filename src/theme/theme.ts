import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0f172a",
      paper: "#111827",
    },
    primary: {
      main: "#38bdf8",
    },
    secondary: {
      main: "#a78bfa",
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: 'var(--font-roboto), "Helvetica", "Arial", sans-serif',
  },
});

export default theme;
