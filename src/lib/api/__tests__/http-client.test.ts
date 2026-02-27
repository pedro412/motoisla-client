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

  it("throws ApiError with normalized data when request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Unauthorized", code: "not_authenticated", fields: {} }),
      }),
    );

    await expect(httpClient.get("/private")).rejects.toBeInstanceOf(ApiError);

    try {
      await httpClient.get("/private");
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.status).toBe(401);
      expect(apiError.code).toBe("not_authenticated");
      expect(apiError.detail).toBe("Unauthorized");
    }
  });
});
