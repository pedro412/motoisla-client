/**
 * WebUSB printer driver — sends raw bytes directly to the printer,
 * bypassing the OS print dialog and driver entirely.
 * Compatible with ESC/POS thermal printers (Epson, Star, Bixolon, POS80, etc.)
 */

// Minimal WebUSB type definitions (not in standard TS lib)
interface UsbEndpoint {
  endpointNumber: number;
  type: "bulk" | "interrupt" | "isochronous" | "control";
  direction: "in" | "out";
}

interface UsbAlternate {
  endpoints: UsbEndpoint[];
}

interface UsbInterface {
  interfaceNumber: number;
  alternate: UsbAlternate;
}

interface UsbConfig {
  interfaces: UsbInterface[];
}

interface UsbDevice {
  opened: boolean;
  configuration: UsbConfig | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(value: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: ArrayBuffer | ArrayBufferView): Promise<{ status: string; bytesWritten: number }>;
}

interface UsbManager {
  getDevices(): Promise<UsbDevice[]>;
}

function getUsb(): UsbManager | null {
  if (typeof navigator === "undefined" || !("usb" in navigator)) return null;
  return (navigator as unknown as { usb: UsbManager }).usb;
}

export interface AuthorizedDevice {
  name: string;
  vendorId: string;
  productId: string;
}

export async function getAuthorizedDevices(): Promise<AuthorizedDevice[]> {
  const usb = getUsb();
  if (!usb) return [];
  const devices = await usb.getDevices();
  return devices.map((d) => ({
    name: (d as unknown as Record<string, string>).productName ?? "Impresora térmica",
    vendorId: ((d as unknown as Record<string, number>).vendorId ?? 0).toString(16).toUpperCase().padStart(4, "0"),
    productId: ((d as unknown as Record<string, number>).productId ?? 0).toString(16).toUpperCase().padStart(4, "0"),
  }));
}

export function isWebUsbSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

/**
 * Sends raw ESC/POS bytes to the first authorized USB printer.
 * Opens device → finds bulk-out endpoint → transfers → closes.
 */
export async function printViaUSB(data: Uint8Array): Promise<void> {
  const usb = getUsb();
  if (!usb) throw new Error("WebUSB no disponible. Usa Chrome o Edge.");

  const devices = await usb.getDevices();
  if (devices.length === 0) {
    throw new Error("Sin impresora autorizada. Ve a Configuración → Impresora → Solicitar acceso.");
  }

  const device = devices[0];
  let claimedInterface = -1;

  try {
    // Close first if previously left open (e.g. after a failed print)
    if (device.opened) {
      try { await device.close(); } catch { /* ignore */ }
    }

    await device.open();

    if (!device.configuration) {
      await device.selectConfiguration(1);
    }

    // Dynamically find the bulk-out endpoint
    let endpointNumber = -1;
    for (const iface of device.configuration!.interfaces) {
      const ep = iface.alternate.endpoints.find(
        (e) => e.type === "bulk" && e.direction === "out",
      );
      if (ep) {
        claimedInterface = iface.interfaceNumber;
        endpointNumber = ep.endpointNumber;
        break;
      }
    }

    if (endpointNumber === -1) {
      throw new Error(
        "No se encontró endpoint de salida en la impresora. Verifica que el dispositivo autorizado es la impresora correcta.",
      );
    }

    await device.claimInterface(claimedInterface);
    await device.transferOut(endpointNumber, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  } finally {
    if (claimedInterface !== -1) {
      try { await device.releaseInterface(claimedInterface); } catch { /* ignore */ }
    }
    try { await device.close(); } catch { /* ignore */ }
  }
}
