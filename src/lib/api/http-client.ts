import { REQUEST_TIMEOUT_MS } from "@/lib/config/env";
import { ApiError } from "@/lib/api/errors";
import type { ApiErrorContract } from "@/lib/types/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  retry?: boolean;
}

function buildPath(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path.startsWith("/") ? `/api/proxy${path}` : `/api/proxy/${path}`, "http://localhost");
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return `${url.pathname}${url.search}`;
}

async function parseApiError(response: Response): Promise<ApiError> {
  let payload: Partial<ApiErrorContract> = {};

  try {
    payload = (await response.json()) as Partial<ApiErrorContract>;
  } catch {
    payload = {};
  }

  return new ApiError({
    code: payload.code ?? `HTTP_${response.status}`,
    detail: payload.detail ?? "Request failed",
    fields: payload.fields ?? {},
    status: response.status,
  });
}

class HttpClient {
  private async request<TResponse>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<TResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const shouldRetry = options.retry ?? method === "GET";

    const execute = async (): Promise<Response> => {
      const headers = new Headers();
      if (options.body !== undefined) {
        headers.set("Content-Type", "application/json");
      }

      return fetch(buildPath(path, options.query), {
        method,
        headers,
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    };

    try {
      let response = await execute();

      if (shouldRetry && method === "GET" && response.status >= 500) {
        response = await execute();
      }

      if (!response.ok) {
        throw await parseApiError(response);
      }

      if (response.status === 204) {
        return undefined as TResponse;
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (shouldRetry && method === "GET") {
        const retryResponse = await execute();
        if (!retryResponse.ok) {
          throw await parseApiError(retryResponse);
        }
        return (await retryResponse.json()) as TResponse;
      }

      const message = error instanceof Error ? error.message : "Unexpected request error";
      throw new ApiError({
        code: "NETWORK_ERROR",
        detail: message,
        fields: {},
        status: 0,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  get<TResponse>(path: string, query?: RequestOptions["query"]) {
    return this.request<TResponse>("GET", path, { query });
  }

  post<TRequest, TResponse>(path: string, body?: TRequest) {
    return this.request<TResponse>("POST", path, { body });
  }

  patch<TRequest, TResponse>(path: string, body?: TRequest) {
    return this.request<TResponse>("PATCH", path, { body });
  }

  put<TRequest, TResponse>(path: string, body?: TRequest) {
    return this.request<TResponse>("PUT", path, { body });
  }

  delete<TResponse>(path: string) {
    return this.request<TResponse>("DELETE", path);
  }
}

export const httpClient = new HttpClient();
