import { Alert, Paper, Stack, Typography } from "@mui/material";

export default function RecoverAccountPage() {
  return (
    <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
      <Stack spacing={2.5}>
        <Typography variant="h5" component="h2" fontWeight={600}>
          Recuperar cuenta
        </Typography>
        <Alert severity="info">Este flujo queda en backlog hasta definir recuperación en backend.</Alert>
      </Stack>
    </Paper>
  );
}
