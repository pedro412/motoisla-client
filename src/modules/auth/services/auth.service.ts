import { ApiError } from "@/lib/api/errors";
import type { AuthSession } from "@/lib/types/auth";

interface LoginResponse {
  session: AuthSession;
}

interface LoginRequest {
  username: string;
  password: string;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError({
      code: data.code ?? `HTTP_${response.status}`,
      detail: data.detail ?? "Request failed",
      fields: data.fields ?? {},
      status: response.status,
    });
  }
  return data as T;
}

export const authService = {
  async login(input: LoginRequest): Promise<AuthSession> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const payload = await parseResponse<LoginResponse>(response);
    return payload.session;
  },

  async logout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  },

  async getSession(): Promise<AuthSession> {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const payload = await parseResponse<{ session: AuthSession }>(response);
    return payload.session;
  },
};
