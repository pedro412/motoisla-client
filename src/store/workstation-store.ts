"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Role } from "@/lib/types/auth";

export interface WorkstationProfile {
  username: string;
  firstName: string;
  role: Role;
  hasPIN: boolean;
}

interface WorkstationState {
  // Persisted
  profiles: WorkstationProfile[];
  inactivityTimeoutMs: number;

  // Persisted — survives refresh
  isLocked: boolean;

  // Actions
  registerProfile: (profile: WorkstationProfile) => void;
  removeProfile: (username: string) => void;
  setInactivityTimeout: (ms: number) => void;
  lock: () => void;
  unlock: () => void;
}

export const useWorkstationStore = create<WorkstationState>()(
  persist(
    (set) => ({
      profiles: [],
      inactivityTimeoutMs: 120_000,
      isLocked: false,

      registerProfile: (profile) =>
        set((state) => {
          const filtered = state.profiles.filter((p) => p.username !== profile.username);
          return { profiles: [...filtered, profile] };
        }),

      removeProfile: (username) =>
        set((state) => ({
          profiles: state.profiles.filter((p) => p.username !== username),
        })),

      setInactivityTimeout: (ms) => set({ inactivityTimeoutMs: ms }),

      lock: () => set({ isLocked: true }),
      unlock: () => set({ isLocked: false }),
    }),
    {
      name: "motoisla-workstation",
      partialize: (state) => ({
        profiles: state.profiles,
        inactivityTimeoutMs: state.inactivityTimeoutMs,
        isLocked: state.isLocked,
      }),
    },
  ),
);
