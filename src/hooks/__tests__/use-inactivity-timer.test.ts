import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInactivityTimer } from "@/hooks/use-inactivity-timer";
import { useWorkstationStore } from "@/store/workstation-store";

/**
 * Helper: the hook's resetTimer throttles calls within 1s of the last activity.
 * Since useRef(Date.now()) and the initial useEffect run at the same fake-timer tick,
 * the very first resetTimer() call is always throttled. We simulate the first "real"
 * activity 1s after mount to start the timeout.
 */
function triggerInitialActivity() {
  vi.advanceTimersByTime(1_001);
  document.dispatchEvent(new Event("mousemove"));
}

describe("useInactivityTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useWorkstationStore.setState({
      profiles: [],
      inactivityTimeoutMs: 5_000,
      isLocked: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets up event listeners when enabled=true and not locked", () => {
    const addSpy = vi.spyOn(document, "addEventListener");

    renderHook(() => useInactivityTimer(true));

    const eventNames = addSpy.mock.calls.map((call) => call[0]);
    expect(eventNames).toContain("mousemove");
    expect(eventNames).toContain("keydown");
    expect(eventNames).toContain("touchstart");
    expect(eventNames).toContain("scroll");
    expect(eventNames).toContain("mousedown");

    addSpy.mockRestore();
  });

  it("does not set up listeners when enabled=false", () => {
    const addSpy = vi.spyOn(document, "addEventListener");

    renderHook(() => useInactivityTimer(false));

    const relevantEvents = addSpy.mock.calls
      .map((call) => call[0])
      .filter((e) => ["mousemove", "keydown", "touchstart", "scroll", "mousedown"].includes(e as string));
    expect(relevantEvents).toHaveLength(0);

    addSpy.mockRestore();
  });

  it("does not set up listeners when already locked", () => {
    useWorkstationStore.setState({ isLocked: true });
    const addSpy = vi.spyOn(document, "addEventListener");

    renderHook(() => useInactivityTimer(true));

    const relevantEvents = addSpy.mock.calls
      .map((call) => call[0])
      .filter((e) => ["mousemove", "keydown", "touchstart", "scroll", "mousedown"].includes(e as string));
    expect(relevantEvents).toHaveLength(0);

    addSpy.mockRestore();
  });

  it("calls lock() after timeout expires following activity", () => {
    renderHook(() => useInactivityTimer(true));

    // Trigger initial activity to start the timer (bypasses 1s throttle)
    triggerInitialActivity();

    expect(useWorkstationStore.getState().isLocked).toBe(false);

    // Advance past the 5s timeout
    vi.advanceTimersByTime(5_000);

    expect(useWorkstationStore.getState().isLocked).toBe(true);
  });

  it("resets timer on user activity (mousemove)", () => {
    renderHook(() => useInactivityTimer(true));

    // Trigger initial activity to start timer
    triggerInitialActivity();

    // Advance 3s into the 5s timeout
    vi.advanceTimersByTime(3_000);
    expect(useWorkstationStore.getState().isLocked).toBe(false);

    // Trigger new activity (>1s since last, passes throttle)
    document.dispatchEvent(new Event("mousemove"));

    // Advance 4s — would have exceeded 5s from initial activity, but timer was reset
    vi.advanceTimersByTime(4_000);
    expect(useWorkstationStore.getState().isLocked).toBe(false);

    // Complete the full 5s from the latest activity event
    vi.advanceTimersByTime(1_000);
    expect(useWorkstationStore.getState().isLocked).toBe(true);
  });

  it("cleans up listeners on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = renderHook(() => useInactivityTimer(true));
    unmount();

    const eventNames = removeSpy.mock.calls.map((call) => call[0]);
    expect(eventNames).toContain("mousemove");
    expect(eventNames).toContain("keydown");
    expect(eventNames).toContain("touchstart");

    removeSpy.mockRestore();
  });
});
