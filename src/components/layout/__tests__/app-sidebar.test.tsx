import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { privateNavItems } from "@/config/navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/pos",
}));

describe("AppSidebar", () => {
  it("renders configured private navigation items", () => {
    render(<AppSidebar navItems={privateNavItems} mobileOpen={false} onMobileClose={vi.fn()} />);

    expect(screen.getAllByText("POS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Admin Reports").length).toBeGreaterThan(0);
  });
});
