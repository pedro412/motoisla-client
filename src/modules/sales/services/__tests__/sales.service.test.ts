import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/http-client", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { httpClient } from "@/lib/api/http-client";
import { salesService } from "@/modules/sales/services/sales.service";

describe("salesService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls preview profitability endpoint with payload", async () => {
    const postSpy = vi.mocked(httpClient.post).mockResolvedValue({
      operating_cost_rate_snapshot: "0.175",
      operating_cost_rate_source: "FALLBACK_BASE",
      operating_cost_amount: "100.00",
      commission_amount: "0.00",
      gross_profit_total: "500.00",
      net_profit_total: "400.00",
      investor_profit_total: "200.00",
      store_profit_total: "200.00",
      lines: [],
    });

    const payload = {
      lines: [
        {
          product: "prod-1",
          qty: "1.00",
          unit_price: "1000.00",
          unit_cost: "600.00",
          discount_pct: "0.00",
        },
      ],
      payments: [
        {
          method: "CASH" as const,
          amount: "1000.00",
        },
      ],
    };

    await salesService.previewProfitability(payload);

    expect(postSpy).toHaveBeenCalledWith("/sales/preview-profitability/", payload);
  });

  it("calls operating cost rate endpoint", async () => {
    const getSpy = vi.mocked(httpClient.get).mockResolvedValue({
      operating_cost_rate: "0.175",
      rate_source: "FALLBACK_BASE",
      calculated_at: "2026-03-04T00:00:00Z",
    });

    await salesService.getOperatingCostRate();

    expect(getSpy).toHaveBeenCalledWith("/profitability/operating-cost-rate/");
  });

  it("keeps confirm sale contract", async () => {
    const postSpy = vi.mocked(httpClient.post).mockResolvedValue({} as never);

    await salesService.confirmSale("sale-123");

    expect(postSpy).toHaveBeenCalledWith("/sales/sale-123/confirm/", {});
  });
});

