import { describe, it, expect, beforeEach } from "vitest";
import { useWorkstationStore } from "@/store/workstation-store";
import type { WorkstationProfile } from "@/store/workstation-store";

const adminProfile: WorkstationProfile = {
  username: "admin1",
  firstName: "Admin",
  role: "ADMIN",
  hasPIN: true,
};

const cashierProfile: WorkstationProfile = {
  username: "cajero1",
  firstName: "Carlos",
  role: "CASHIER",
  hasPIN: false,
};

describe("workstation-store", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useWorkstationStore.setState({
      profiles: [],
      inactivityTimeoutMs: 120_000,
      isLocked: false,
    });
  });

  it("initial state has empty profiles and isLocked=false", () => {
    const state = useWorkstationStore.getState();
    expect(state.profiles).toEqual([]);
    expect(state.isLocked).toBe(false);
    expect(state.inactivityTimeoutMs).toBe(120_000);
  });

  it("registerProfile adds a new profile", () => {
    useWorkstationStore.getState().registerProfile(adminProfile);

    const { profiles } = useWorkstationStore.getState();
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toEqual(adminProfile);
  });

  it("registerProfile upserts by username (updates existing)", () => {
    useWorkstationStore.getState().registerProfile(adminProfile);

    const updated: WorkstationProfile = {
      ...adminProfile,
      firstName: "SuperAdmin",
      hasPIN: false,
    };
    useWorkstationStore.getState().registerProfile(updated);

    const { profiles } = useWorkstationStore.getState();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].firstName).toBe("SuperAdmin");
    expect(profiles[0].hasPIN).toBe(false);
  });

  it("registerProfile preserves other profiles on upsert", () => {
    useWorkstationStore.getState().registerProfile(adminProfile);
    useWorkstationStore.getState().registerProfile(cashierProfile);

    const updated: WorkstationProfile = { ...adminProfile, firstName: "New" };
    useWorkstationStore.getState().registerProfile(updated);

    const { profiles } = useWorkstationStore.getState();
    expect(profiles).toHaveLength(2);
    expect(profiles.find((p) => p.username === "cajero1")).toEqual(cashierProfile);
    expect(profiles.find((p) => p.username === "admin1")?.firstName).toBe("New");
  });

  it("removeProfile removes by username", () => {
    useWorkstationStore.getState().registerProfile(adminProfile);
    useWorkstationStore.getState().registerProfile(cashierProfile);

    useWorkstationStore.getState().removeProfile("admin1");

    const { profiles } = useWorkstationStore.getState();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].username).toBe("cajero1");
  });

  it("removeProfile is a no-op for nonexistent username", () => {
    useWorkstationStore.getState().registerProfile(adminProfile);
    useWorkstationStore.getState().removeProfile("nonexistent");

    expect(useWorkstationStore.getState().profiles).toHaveLength(1);
  });

  it("lock sets isLocked=true", () => {
    useWorkstationStore.getState().lock();
    expect(useWorkstationStore.getState().isLocked).toBe(true);
  });

  it("unlock sets isLocked=false", () => {
    useWorkstationStore.setState({ isLocked: true });
    useWorkstationStore.getState().unlock();
    expect(useWorkstationStore.getState().isLocked).toBe(false);
  });

  it("setInactivityTimeout updates the timeout value", () => {
    useWorkstationStore.getState().setInactivityTimeout(300_000);
    expect(useWorkstationStore.getState().inactivityTimeoutMs).toBe(300_000);
  });
});
