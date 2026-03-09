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

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const REQUEST_TIMEOUT_MS = 12_000;

export const MEDIA_MAX_BYTES = parsePositiveInt(process.env.NEXT_PUBLIC_MEDIA_MAX_BYTES, 8_388_608);
export const MEDIA_MAX_DIMENSION = parsePositiveInt(process.env.NEXT_PUBLIC_MEDIA_MAX_DIMENSION, 3000);
