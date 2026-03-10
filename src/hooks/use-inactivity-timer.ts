"use client";
import { useEffect, useRef } from "react";

import { useWorkstationStore } from "@/store/workstation-store";

export function useInactivityTimer(enabled: boolean) {
  const timeoutMs = useWorkstationStore((s) => s.inactivityTimeoutMs);
  const isLocked = useWorkstationStore((s) => s.isLocked);
  const lock = useWorkstationStore((s) => s.lock);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(0);

  useEffect(() => {
    if (!enabled || isLocked) return;

    lastActivityRef.current = Date.now();

    function resetTimer() {
      const now = Date.now();
      if (now - lastActivityRef.current < 1000) return;
      lastActivityRef.current = now;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lock();
      }, timeoutMs);
    }

    // Start the timer immediately
    resetTimer();

    const events = ["mousemove", "keydown", "touchstart", "scroll", "mousedown"] as const;
    events.forEach((event) => document.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [enabled, isLocked, timeoutMs, lock]);
}
