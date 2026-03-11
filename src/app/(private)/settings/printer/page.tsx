"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import UsbRoundedIcon from "@mui/icons-material/UsbRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useState } from "react";

import { DetailPageHeader } from "@/components/common/detail-page-header";
import { buildTestTicketBytes } from "@/lib/print/escpos";
import {
  getAuthorizedDevices,
  isWebUsbSupported,
  printViaUSB,
  type AuthorizedDevice,
} from "@/lib/print/usb-printer";
import { usePrinterStore } from "@/store/printer-store";

// ─── Char width presets ───────────────────────────────────────────────────────

const CHAR_WIDTH_PRESETS = [
  { value: 32, label: "32 col", sublabel: "Papel 58 mm" },
  { value: 42, label: "42 col", sublabel: "Papel 80 mm" },
  { value: 48, label: "48 col", sublabel: "80 mm amplio" },
] as const;

// ─── WebUSB helpers ───────────────────────────────────────────────────────────

type WebUsbLike = {
  getDevices(): Promise<unknown[]>;
  requestDevice(options: { filters: unknown[] }): Promise<unknown>;
};

function getRawUsb(): WebUsbLike | null {
  if (typeof navigator === "undefined" || !("usb" in navigator)) return null;
  return (navigator as unknown as { usb: WebUsbLike }).usb;
}

// ─── Instruction steps ────────────────────────────────────────────────────────

const STEPS: {
  num: number;
  title: string;
  body: string;
  note?: string;
  isNew?: boolean;
}[] = [
  {
    num: 1,
    title: "Conecta el cable USB a la computadora",
    body: "Conecta el cable USB-B (cuadrado) a la impresora y el USB-A a la computadora. La impresora debe encenderse. No necesitas instalar drivers especiales para imprimir directamente vía esta app — los datos se envían en protocolo ESC/POS por WebUSB, sin pasar por el driver del sistema operativo.",
    isNew: true,
  },
  {
    num: 2,
    title: "Haz clic en «Solicitar acceso a impresora»",
    body: "Usa el botón de abajo. Chrome/Edge mostrará un diálogo con los dispositivos USB conectados. Selecciona tu impresora (POS80, Epson TM, Bixolon, etc.) y haz clic en «Conectar». El navegador recordará el permiso en futuras sesiones.",
    note: "Solo necesitas hacer esto una vez por navegador. Si cambias de perfil o navegador, repite el paso.",
    isNew: true,
  },
  {
    num: 3,
    title: "Imprime un ticket de prueba",
    body: "Usa el botón «Imprimir ticket de prueba» en la sección de abajo. Si el papel sale correctamente (texto legible, sin caracteres extraños) y la hoja se corta al final, la impresora está lista.",
    note: "Si el papel no se corta, verifica que tu impresora soporte el comando ESC/POS GS V (corte parcial). La mayoría de las impresoras POS modernas lo soportan.",
  },
  {
    num: 4,
    title: "(Opcional) Configura como impresora predeterminada del sistema",
    body: "Solo necesario si quieres imprimir desde otras apps (Word, Chrome PDF, etc.).\n\nmacOS: Configuración del sistema → Impresoras y escáneres → selecciona tu impresora → clic derecho → «Establecer como predeterminada».\n\nWindows: Configuración → Bluetooth y dispositivos → Impresoras y escáneres → selecciona → «Establecer como predeterminada».",
    note: "Para esta app de ventas NO es necesario — la impresión es directa por WebUSB.",
  },
  {
    num: 5,
    title: "Troubleshooting: si ves texto basura o caracteres extraños",
    body: "Esto indica que el sistema operativo envió los datos como PostScript en lugar de ESC/POS. Asegúrate de imprimir DESDE ESTA APP (que usa WebUSB directo). Si el problema persiste, desconecta y reconecta el USB, y usa «Solicitar acceso» nuevamente para re-autorizar el dispositivo.",
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PrinterSettingsPage() {
  const { status, setStatus, charWidth, setCharWidth, storeAddress, setStoreAddress, storePhone, setStorePhone } = usePrinterStore();

  const [devices, setDevices] = useState<AuthorizedDevice[]>([]);
  const usbSupported = isWebUsbSupported();
  const [printError, setPrintError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);

  async function handleCheck() {
    setChecking(true);
    setPrintError(null);
    try {
      const devs = await getAuthorizedDevices();
      setDevices(devs);
      setStatus(devs.length > 0 ? "ok" : "idle");
    } catch {
      setPrintError("No fue posible consultar los dispositivos USB.");
    } finally {
      setChecking(false);
    }
  }

  async function handleRequestDevice() {
    const usb = getRawUsb();
    if (!usb) return;
    setConnecting(true);
    setPrintError(null);
    try {
      await usb.requestDevice({ filters: [] });
      // Re-fetch authorized devices to update the list
      const devs = await getAuthorizedDevices();
      setDevices(devs);
      setStatus(devs.length > 0 ? "ok" : "idle");
    } catch (err) {
      if (err instanceof Error && err.name !== "NotFoundError") {
        setPrintError("No se pudo autorizar el dispositivo. Intenta de nuevo.");
      }
      // NotFoundError = user closed dialog — not an error
    } finally {
      setConnecting(false);
    }
  }

  async function handleTestPrint() {
    setTestPrinting(true);
    setPrintError(null);
    try {
      const bytes = buildTestTicketBytes({ charWidth, storeAddress, storePhone });
      await printViaUSB(bytes);
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setPrintError(err instanceof Error ? err.message : "Error al imprimir el ticket de prueba.");
    } finally {
      setTestPrinting(false);
    }
  }

  const statusColor = status === "ok" ? "#22c55e" : status === "error" ? "#ef4444" : "#52525b";
  const StatusIcon =
    status === "ok"
      ? CheckCircleRoundedIcon
      : status === "error"
        ? ErrorRoundedIcon
        : HelpOutlineRoundedIcon;
  const statusText =
    status === "ok"
      ? "Impresora lista"
      : status === "error"
        ? "Error en última impresión"
        : "Sin datos de impresora";

  return (
    <Stack spacing={3}>
      <DetailPageHeader
        breadcrumbs={[{ label: "Configuración" }, { label: "Impresora" }]}
        title="Impresora térmica"
        description="Configura la impresora de tickets ESC/POS. La impresión es directa por USB — sin diálogos del sistema operativo."
      />

      {/* ── Status ─────────────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2.5}>
          <Typography variant="h6" fontWeight={800}>
            Estado de conexión
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 2,
                borderRadius: 2.5,
                border: `1px solid ${statusColor}33`,
                backgroundColor: `${statusColor}14`,
                flex: 1,
              }}
            >
              <StatusIcon sx={{ color: statusColor, fontSize: 32 }} />
              <Stack spacing={0.25}>
                <Typography fontWeight={800} sx={{ color: statusColor }}>
                  {statusText}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {devices.length > 0
                    ? devices.map((d) => d.name).join(", ")
                    : status === "ok"
                      ? "Última impresión exitosa"
                      : "Haz clic en «Verificar» o imprime un ticket de prueba para actualizar"}
                </Typography>
              </Stack>
            </Box>

            {usbSupported && (
              <Stack direction="row" spacing={1} flexShrink={0}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={handleCheck}
                  disabled={checking}
                  size="small"
                >
                  {checking ? "Verificando..." : "Verificar"}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<UsbRoundedIcon />}
                  onClick={handleRequestDevice}
                  disabled={connecting}
                  size="small"
                >
                  {connecting ? "Conectando..." : "Solicitar acceso"}
                </Button>
              </Stack>
            )}
          </Stack>

          {!usbSupported && (
            <Alert severity="warning" icon={<InfoRoundedIcon />}>
              <strong>WebUSB no disponible.</strong> Usa Chrome o Edge para imprimir directamente sin diálogos. Firefox
              y Safari no soportan WebUSB.
            </Alert>
          )}

          {printError && <Alert severity="error">{printError}</Alert>}

          {devices.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary" fontWeight={700}>
                Dispositivos autorizados
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {devices.map((d, i) => (
                  <Chip
                    key={i}
                    icon={<UsbRoundedIcon />}
                    label={`${d.name} (VID ${d.vendorId} / PID ${d.productId})`}
                    size="small"
                    sx={{ backgroundColor: "#22c55e1a", color: "#22c55e", border: "1px solid #22c55e33" }}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* ── Char width ─────────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={800}>
              Ancho del papel
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Define cuántos caracteres caben por línea. Ajusta al papel que usa tu impresora. El cambio aplica en
              todos los tickets desde este momento.
            </Typography>
          </Stack>

          <ToggleButtonGroup
            value={charWidth}
            exclusive
            onChange={(_, v) => {
              if (v !== null) setCharWidth(v as number);
            }}
            size="small"
            sx={{ flexWrap: "wrap", gap: 1 }}
          >
            {CHAR_WIDTH_PRESETS.map((preset) => (
              <ToggleButton
                key={preset.value}
                value={preset.value}
                sx={{
                  px: 2.5,
                  py: 1.25,
                  borderRadius: "10px !important",
                  border: "1px solid rgba(161, 161, 170, 0.2) !important",
                  "&.Mui-selected": {
                    backgroundColor: "rgba(56, 189, 248, 0.14)",
                    borderColor: "rgba(56, 189, 248, 0.4) !important",
                    color: "#bae6fd",
                  },
                }}
              >
                <Stack spacing={0} alignItems="center">
                  <Typography fontWeight={800} variant="body2">
                    {preset.label}
                  </Typography>
                  <Typography variant="caption" color="inherit" sx={{ opacity: 0.7 }}>
                    {preset.sublabel}
                  </Typography>
                </Stack>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {/* Live separator preview */}
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
              Vista previa del separador ({charWidth} caracteres)
            </Typography>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(161, 161, 170, 0.14)",
                overflowX: "auto",
              }}
            >
              <pre
                style={{
                  margin: 0,
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: "11px",
                  color: "#a1a1aa",
                  whiteSpace: "pre",
                }}
              >
                {"=".repeat(charWidth) +
                  "\n" +
                  "MOTO ISLA".padStart(Math.floor((charWidth + 9) / 2)) +
                  "\n" +
                  "TICKET DE VENTA".padStart(Math.floor((charWidth + 15) / 2)) +
                  "\n" +
                  "=".repeat(charWidth)}
              </pre>
            </Box>
          </Box>
        </Stack>
      </Paper>

      {/* ── Store info ─────────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={800}>
              Información de la tienda
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Se imprime al final de cada ticket, centrado, debajo del mensaje de agradecimiento. Deja vacío para omitirlo.
            </Typography>
          </Stack>

          <Stack spacing={2}>
            <TextField
              label="Dirección"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="Ej. Calle Juárez 45, Col. Centro, Mérida Yuc."
              fullWidth
              helperText={storeAddress.length > charWidth ? `Excede el ancho (${charWidth} col) — se truncará al imprimir` : " "}
              error={storeAddress.length > charWidth}
            />
            <TextField
              label="Teléfono"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              placeholder="Ej. 999 123 4567"
              fullWidth
            />
          </Stack>

          {/* Footer preview */}
          {(storeAddress.trim() || storePhone.trim()) && (
            <Box>
              <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 1 }}>
                Vista previa del pie de ticket
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(161, 161, 170, 0.14)",
                  overflowX: "auto",
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: "11px",
                    color: "#a1a1aa",
                    whiteSpace: "pre",
                  }}
                >
                  {(() => {
                    const pad = (s: string) => {
                      const len = Math.min(s.length, charWidth);
                      return " ".repeat(Math.max(0, Math.floor((charWidth - len) / 2))) + s.slice(0, charWidth);
                    };
                    const lines = [
                      "=".repeat(charWidth),
                      pad("!Gracias por su visita!"),
                      "-".repeat(charWidth),
                      ...(storeAddress.trim() ? [pad(storeAddress.trim())] : []),
                      ...(storePhone.trim() ? [pad(`Tel: ${storePhone.trim()}`)] : []),
                      "=".repeat(charWidth),
                      "",
                      "",
                      "",
                      "",
                      "[corte de papel]",
                    ];
                    return lines.join("\n");
                  })()}
                </pre>
              </Box>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* ── Test print ─────────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={800}>
              Ticket de prueba
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Imprime un ticket de muestra para verificar que la impresora funciona, que el ancho es correcto y que el
              corte de papel funciona al final.
            </Typography>
          </Stack>

          {/* Screen preview */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(161, 161, 170, 0.14)",
              overflowX: "auto",
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: "11px",
                color: "#a1a1aa",
                whiteSpace: "pre",
              }}
            >
              {(() => {
                const nL = Math.max(8, charWidth - 22);
                const ctr = (s: string) => {
                  const len = Math.min(s.length, charWidth);
                  return " ".repeat(Math.max(0, Math.floor((charWidth - len) / 2))) + s.slice(0, charWidth);
                };
                const hasInfo = storeAddress.trim() || storePhone.trim();
                return [
                  "=".repeat(charWidth),
                  ctr("MOTO ISLA"),
                  ctr("TICKET DE PRUEBA"),
                  "=".repeat(charWidth),
                  `Ancho:   ${charWidth} columnas`,
                  `Papel:   ${charWidth <= 32 ? "58 mm" : "80 mm"}`,
                  "-".repeat(charWidth),
                  `${"ARTICULO".padEnd(nL)} CAN    P.U.   TOTAL`,
                  "-".repeat(charWidth),
                  `${"Aceite Motor 10W".padEnd(nL)}   1  $150.00  $150.00`,
                  `${"Filtro Aire".padEnd(nL)}   2   $80.00  $160.00`,
                  "-".repeat(charWidth),
                  `TOTAL:${" $310.00".padStart(charWidth - 6)}`,
                  "=".repeat(charWidth),
                  `Efectivo${" $400.00".padStart(charWidth - 8)}`,
                  `Cambio:${" $90.00".padStart(charWidth - 7)}`,
                  "=".repeat(charWidth),
                  ctr("!Impresora lista!"),
                  ...(hasInfo ? ["-".repeat(charWidth)] : []),
                  ...(storeAddress.trim() ? [ctr(storeAddress.trim())] : []),
                  ...(storePhone.trim() ? [ctr(`Tel: ${storePhone.trim()}`)] : []),
                  "=".repeat(charWidth),
                  "",
                  "",
                  "",
                  "",
                  "[corte de papel]",
                ].join("\n");
              })()}
            </pre>
          </Box>

          <Button
            variant="contained"
            startIcon={<PrintRoundedIcon />}
            onClick={handleTestPrint}
            disabled={testPrinting}
            sx={{
              alignSelf: "flex-start",
              fontWeight: 800,
              backgroundColor: "#0ea5e9",
              "&:hover": { backgroundColor: "#0284c7" },
            }}
          >
            {testPrinting ? "Imprimiendo..." : "Imprimir ticket de prueba"}
          </Button>
        </Stack>
      </Paper>

      {/* ── Instructions ───────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Typography variant="h6" fontWeight={800}>
              Cómo conectar tu impresora térmica
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Esta app imprime en protocolo ESC/POS directamente por USB — sin pasar por el driver del sistema
              operativo ni abrir ningún diálogo de impresión.
            </Typography>
          </Stack>

          <Stack spacing={0}>
            {STEPS.map((step, index) => (
              <Box key={step.num}>
                <Stack direction="row" spacing={2} sx={{ py: 2 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: step.isNew
                        ? "rgba(56, 189, 248, 0.2)"
                        : "rgba(56, 189, 248, 0.1)",
                      border: `1px solid ${step.isNew ? "rgba(56, 189, 248, 0.5)" : "rgba(56, 189, 248, 0.25)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="body2" fontWeight={900} sx={{ color: "#38bdf8" }}>
                      {step.num}
                    </Typography>
                  </Box>
                  <Stack spacing={0.75} flex={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={800}>{step.title}</Typography>
                      {step.isNew && (
                        <Chip
                          label="Clave"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "10px",
                            fontWeight: 800,
                            backgroundColor: "rgba(56, 189, 248, 0.14)",
                            color: "#38bdf8",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                      {step.body}
                    </Typography>
                    {step.note && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 0.75,
                          mt: 0.5,
                          p: 1.25,
                          borderRadius: 1.5,
                          backgroundColor: "rgba(245, 158, 11, 0.08)",
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                        }}
                      >
                        <HelpOutlineRoundedIcon sx={{ fontSize: 15, color: "#fbbf24", mt: "1px", flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: "#fde68a" }}>
                          {step.note}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Stack>
                {index < STEPS.length - 1 && <Divider sx={{ ml: 6 }} />}
              </Box>
            ))}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
