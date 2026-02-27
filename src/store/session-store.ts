"use client";

import { create } from "zustand";

import type { AuthSession } from "@/lib/types/auth";

interface SessionState {
  session: AuthSession;
  hydrated: boolean;
  setSession: (session: AuthSession) => void;
  setHydrated: (value: boolean) => void;
  clearSession: () => void;
}

const defaultSession: AuthSession = {
  isAuthenticated: false,
};

export const useSessionStore = create<SessionState>((set) => ({
  session: defaultSession,
  hydrated: false,
  setSession: (session) => set({ session }),
  setHydrated: (value) => set({ hydrated: value }),
  clearSession: () => set({ session: defaultSession }),
}));
