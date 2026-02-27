const fallbackApiUrl = "http://localhost:8000/api/v1";

function normalizeBaseUrl(rawValue: string | undefined): string {
  const value = rawValue?.trim() || fallbackApiUrl;
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallbackApiUrl;
  }
}

export const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const REQUEST_TIMEOUT_MS = 12_000;
