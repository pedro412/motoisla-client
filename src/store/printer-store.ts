"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type PrinterStatus = "idle" | "ok" | "error";

interface PrinterState {
  // Runtime — not persisted
  status: PrinterStatus;
  setStatus: (status: PrinterStatus) => void;
  // Config — persisted
  charWidth: number;
  setCharWidth: (w: number) => void;
  storeAddress: string;
  setStoreAddress: (v: string) => void;
  storePhone: string;
  setStorePhone: (v: string) => void;
}

export const usePrinterStore = create<PrinterState>()(
  persist(
    (set) => ({
      status: "idle",
      setStatus: (status) => set({ status }),
      charWidth: 42,
      setCharWidth: (charWidth) => set({ charWidth }),
      storeAddress: "",
      setStoreAddress: (storeAddress) => set({ storeAddress }),
      storePhone: "",
      setStorePhone: (storePhone) => set({ storePhone }),
    }),
    {
      name: "motoisla-printer-config",
      partialize: (state) => ({
        charWidth: state.charWidth,
        storeAddress: state.storeAddress,
        storePhone: state.storePhone,
      }),
    },
  ),
);
