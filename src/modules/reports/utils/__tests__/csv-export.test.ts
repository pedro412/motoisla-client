import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadMonthlyReportCsv } from "../csv-export";
import type { SalesReportResponse } from "@/lib/types/reports";

function buildReport(overrides: Partial<SalesReportResponse> = {}): SalesReportResponse {
  return {
    total_sales: "50000.00",
    avg_ticket: "1000.00",
    sales_count: 50,
    gross_profit: "15000.00",
    gross_profit_total: "15000.00",
    purchase_spend: "35000.00",
    purchase_count: 10,
    investor_metrics: {
      investor_backed_sales_total: "10000.00",
      store_owned_sales_total: "40000.00",
      investor_profit_share_total: "2000.00",
      store_profit_share_total: "8000.00",
      inventory_cost_assigned_to_investors: "5000.00",
      store_net_inventory_exposure_change: "30000.00",
    },
    inventory_snapshot: {
      cost_value: "100000.00",
      retail_value: "200000.00",
      potential_profit: "100000.00",
      total_units: "500",
      gross_margin_pct: "50.00",
      store_owned_units: "400",
      investor_assigned_units: "100",
      store_owned_cost_value: "80000.00",
      investor_assigned_cost_value: "20000.00",
      store_owned_potential_profit: "80000.00",
      investor_assigned_potential_profit: "20000.00",
    },
    range: { date_from: "2026-02-01", date_to: "2026-02-28" },
    top_products: [],
    payment_breakdown: {
      by_method: [
        { method: "CASH", total_amount: "30000.00", transactions: 30 },
        { method: "CARD", total_amount: "20000.00", transactions: 20 },
      ],
      card_types: [],
      card_instruments: [
        { card_instrument: "DEBIT", total_amount: "8000.00", transactions: 10 },
        { card_instrument: "CREDIT", total_amount: "12000.00", transactions: 10 },
      ],
    },
    sales_by_day: [
      { confirmed_at__date: "2026-02-01", total_sales: "5000.00", sales_count: 5 },
      { confirmed_at__date: "2026-02-02", total_sales: "3000.00", sales_count: 3 },
    ],
    sales_by_cashier: [],
    expenses_summary: {
      total_expenses: "5000.00",
      expenses_count: 8,
      by_category: [],
    },
    net_sales_after_expenses: "45000.00",
    net_profit: "10000.00",
    ...overrides,
  };
}

describe("downloadMonthlyReportCsv", () => {
  let clickedHref: string | undefined;
  let clickedDownload: string | undefined;

  beforeEach(() => {
    clickedHref = undefined;
    clickedDownload = undefined;

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:fake-url"),
      revokeObjectURL: vi.fn(),
    });

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        const anchor = {
          href: "",
          download: "",
          click: vi.fn(function (this: { href: string; download: string }) {
            clickedHref = this.href;
            clickedDownload = this.download;
          }),
        };
        return anchor as unknown as HTMLElement;
      }
      return document.createElement(tag);
    });
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
  });

  it("creates a CSV blob and triggers download", () => {
    const report = buildReport();
    downloadMonthlyReportCsv(report, "Febrero 2026");

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/csv;charset=utf-8;");

    expect(clickedHref).toBe("blob:fake-url");
    expect(clickedDownload).toBe("reporte-mensual-febrero-2026.csv");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("includes BOM prefix for Excel compatibility", async () => {
    const report = buildReport();
    downloadMonthlyReportCsv(report, "Febrero 2026");

    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    // UTF-8 BOM: 0xEF 0xBB 0xBF
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
  });

  it("includes summary section with correct values", async () => {
    const report = buildReport();
    downloadMonthlyReportCsv(report, "Febrero 2026");

    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    const text = await blob.text();

    expect(text).toContain("Reporte Mensual — MotoIsla");
    expect(text).toContain("Periodo: Febrero 2026");
    expect(text).toContain("RESUMEN");
    expect(text).toContain("Número de ventas,50");
    expect(text).toContain("Utilidad neta tienda,");
  });

  it("includes card instrument breakdown", async () => {
    const report = buildReport();
    downloadMonthlyReportCsv(report, "Marzo 2026");

    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    const text = await blob.text();

    expect(text).toContain("Tarjeta de débito");
    expect(text).toContain("Tarjeta de crédito");
  });

  it("includes sales by day rows", async () => {
    const report = buildReport();
    downloadMonthlyReportCsv(report, "Febrero 2026");

    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    const text = await blob.text();

    expect(text).toContain("VENTAS POR DÍA");
    expect(text).toContain("2026-02-01");
    expect(text).toContain("2026-02-02");
  });

  it("handles empty card_instruments gracefully", async () => {
    const report = buildReport({
      payment_breakdown: {
        by_method: [{ method: "CASH", total_amount: "1000.00", transactions: 5 }],
        card_types: [],
        card_instruments: [],
      },
    });
    downloadMonthlyReportCsv(report, "Enero 2026");

    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    const text = await blob.text();

    expect(text).not.toContain("Tarjeta de débito");
    expect(text).not.toContain("Tarjeta de crédito");
    expect(text).toContain("Efectivo");
  });

  it("generates correct filename from month label", () => {
    const report = buildReport();
    downloadMonthlyReportCsv(report, "Marzo 2026");
    expect(clickedDownload).toBe("reporte-mensual-marzo-2026.csv");
  });
});
