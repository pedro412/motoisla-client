import { httpClient } from "@/lib/api/http-client";
import type { MetricsResponse, SalesReportResponse } from "@/lib/types/reports";

type ReportParams = Record<string, string | number | undefined> & {
  date_from?: string;
  date_to?: string;
  top_limit?: number;
};

export const reportsService = {
  getMetrics(params: ReportParams) {
    return httpClient.get<MetricsResponse>("/metrics/", params);
  },

  getSalesReport(params: ReportParams) {
    return httpClient.get<SalesReportResponse>("/reports/sales/", params);
  },
};
