import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { WorkstationProfile } from "@/store/workstation-store";

// --- Mock stores ---

const mockProfiles: WorkstationProfile[] = [
  { username: "admin1", firstName: "Admin", role: "ADMIN", hasPIN: true },
  { username: "cajero1", firstName: "Carlos", role: "CASHIER", hasPIN: false },
];

const mockUnlock = vi.fn();
const mockRegisterProfile = vi.fn();

vi.mock("@/store/workstation-store", () => ({
  useWorkstationStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      profiles: mockProfiles,
      isLocked: true,
      inactivityTimeoutMs: 120_000,
      unlock: mockUnlock,
      registerProfile: mockRegisterProfile,
    };
    return selector ? selector(state) : state;
  }),
}));

const mockSetSession = vi.fn();
const mockSetHydrated = vi.fn();
const mockClearSession = vi.fn();

vi.mock("@/store/session-store", () => ({
  useSessionStore: vi.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      session: { isAuthenticated: false },
      hydrated: false,
      setSession: mockSetSession,
      setHydrated: mockSetHydrated,
      clearSession: mockClearSession,
    };
    return selector ? selector(state) : state;
  }),
}));

// --- Mock auth service ---

const mockLogin = vi.fn();
const mockPinLogin = vi.fn();

vi.mock("@/modules/auth/services/auth.service", () => ({
  authService: {
    login: (...args: unknown[]) => mockLogin(...args),
    pinLogin: (...args: unknown[]) => mockPinLogin(...args),
  },
}));

// --- Mock next/navigation ---

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// --- Mock TanStack Query ---

const mockQueryClear = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ clear: mockQueryClear }),
}));

// --- Import component after mocks ---

import { LockScreen } from "@/components/layout/lock-screen";

describe("LockScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders clock (time display)", () => {
    render(<LockScreen />);

    // The clock shows time in HH:MM format — look for a colon in a heading
    const timeEl = screen.getByRole("heading", { level: 1 });
    expect(timeEl).toBeInTheDocument();
    expect(timeEl.textContent).toMatch(/\d{1,2}:\d{2}/);
  });

  it("renders profile avatars from workstation store", () => {
    render(<LockScreen />);

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument(); // Admin initial
    expect(screen.getByText("C")).toBeInTheDocument(); // Carlos initial
  });

  it("renders role labels for profiles", () => {
    render(<LockScreen />);

    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    expect(screen.getByText("CASHIER")).toBeInTheDocument();
  });

  it("clicking a profile with PIN shows PIN input screen", async () => {
    const user = userEvent.setup();
    render(<LockScreen />);

    // Click the Admin profile (has PIN)
    await user.click(screen.getByText("Admin"));

    expect(screen.getByText("Ingresa tu PIN")).toBeInTheDocument();
    // Should have 6 PIN input fields
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);
    // Should also show "Usar contrasena" fallback button
    expect(screen.getByText("Usar contraseña")).toBeInTheDocument();
  });

  it("clicking a profile without PIN shows password input screen", async () => {
    const user = userEvent.setup();
    render(<LockScreen />);

    // Click the Carlos profile (no PIN)
    await user.click(screen.getByText("Carlos"));

    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desbloquear" })).toBeInTheDocument();
    // Should NOT show "Usar PIN" button since profile has no PIN
    expect(screen.queryByText("Usar PIN")).not.toBeInTheDocument();
  });

  it("shows 'Iniciar como otro usuario' button", () => {
    render(<LockScreen />);

    expect(screen.getByText("Iniciar como otro usuario")).toBeInTheDocument();
  });

  it("clicking 'Iniciar como otro usuario' shows full login form", async () => {
    const user = userEvent.setup();
    render(<LockScreen />);

    await user.click(screen.getByText("Iniciar como otro usuario"));

    expect(screen.getByText("Iniciar sesión")).toBeInTheDocument();
    expect(screen.getByLabelText("Usuario")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("can navigate back from PIN screen to profiles", async () => {
    const user = userEvent.setup();
    render(<LockScreen />);

    await user.click(screen.getByText("Admin"));
    expect(screen.getByText("Ingresa tu PIN")).toBeInTheDocument();

    await user.click(screen.getByText("Atrás"));
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Carlos")).toBeInTheDocument();
  });

  it("can switch from PIN screen to password screen", async () => {
    const user = userEvent.setup();
    render(<LockScreen />);

    await user.click(screen.getByText("Admin"));
    expect(screen.getByText("Ingresa tu PIN")).toBeInTheDocument();

    await user.click(screen.getByText("Usar contraseña"));
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desbloquear" })).toBeInTheDocument();
    // Since admin has PIN, should show "Usar PIN" to switch back
    expect(screen.getByText("Usar PIN")).toBeInTheDocument();
  });

  it("can navigate back from full login to profiles", async () => {
    const user = userEvent.setup();
    render(<LockScreen />);

    await user.click(screen.getByText("Iniciar como otro usuario"));
    expect(screen.getByText("Iniciar sesión")).toBeInTheDocument();

    await user.click(screen.getByText("Atrás"));
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Iniciar como otro usuario")).toBeInTheDocument();
  });

  it("'Ir a login completo' clears session and navigates to /login", async () => {
    const user = userEvent.setup();
    render(<LockScreen />);

    await user.click(screen.getByText("Iniciar como otro usuario"));
    await user.click(screen.getByText("Ir a login completo"));

    expect(mockClearSession).toHaveBeenCalled();
    expect(mockQueryClear).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/login");
    expect(mockRefresh).toHaveBeenCalled();
  });
});
