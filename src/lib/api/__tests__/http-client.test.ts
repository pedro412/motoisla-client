import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { httpClient } from "@/lib/api/http-client";

describe("httpClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed json when request succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      }),
    );

    const result = await httpClient.get<{ ok: boolean }>("/health/");

    expect(result).toEqual({ ok: true });
  });

  it("throws ApiError when request fails with non-401 status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ detail: "Forbidden", code: "permission_denied", fields: {} }),
      }),
    );

    await expect(httpClient.get("/private")).rejects.toBeInstanceOf(ApiError);

    try {
      await httpClient.get("/private");
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.status).toBe(403);
      expect(apiError.code).toBe("permission_denied");
      expect(apiError.detail).toBe("Forbidden");
    }
  });

  it("retries with refresh on 401 and succeeds", async () => {
    const mockFetch = vi.fn();
    // First call: original request → 401
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    // Second call: refresh → success
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });
    // Third call: retry original request → success
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: "ok" }) });

    vi.stubGlobal("fetch", mockFetch);

    const result = await httpClient.get<{ data: string }>("/private");
    expect(result).toEqual({ data: "ok" });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("redirects to login when refresh fails on 401", async () => {
    const mockFetch = vi.fn();
    // First call: original request → 401
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    // Second call: refresh → also fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });

    vi.stubGlobal("fetch", mockFetch);

    await expect(httpClient.get("/private")).rejects.toBeInstanceOf(ApiError);

    try {
      // Reset for second attempt
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
      await httpClient.get("/private");
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.code).toBe("session_expired");
      expect(apiError.status).toBe(401);
    }
  });
});
