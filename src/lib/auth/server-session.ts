import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE, ROLE_COOKIE, USERNAME_COOKIE } from "@/lib/auth/cookies";
import { API_BASE_URL, IS_PRODUCTION } from "@/lib/config/env";
import type { Role } from "@/lib/types/auth";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const secureCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: IS_PRODUCTION,
  path: "/",
};

async function probeRole(accessToken: string): Promise<Role> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const adminProbe = await fetch(`${API_BASE_URL}/metrics/`, { headers, cache: "no-store" });
  if (adminProbe.ok) {
    return "ADMIN";
  }

  const investorProbe = await fetch(`${API_BASE_URL}/investors/me/`, { headers, cache: "no-store" });
  if (investorProbe.ok) {
    return "INVESTOR";
  }

  return "CASHIER";
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access: string; refresh: string } | null> {
  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { access?: string; refresh?: string };
  if (!data.access) return null;
  return { access: data.access, refresh: data.refresh ?? refreshToken };
}

export async function saveSessionCookies(params: {
  cookieStore: CookieStore;
  accessToken: string;
  refreshToken: string;
  username: string;
}) {
  const role = await probeRole(params.accessToken);
  params.cookieStore.set(ACCESS_COOKIE, params.accessToken, secureCookie);
  params.cookieStore.set(REFRESH_COOKIE, params.refreshToken, secureCookie);
  params.cookieStore.set(ROLE_COOKIE, role, secureCookie);
  params.cookieStore.set(USERNAME_COOKIE, params.username, secureCookie);
  return role;
}

export function clearSessionCookies(cookieStore: CookieStore) {
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete(ROLE_COOKIE);
  cookieStore.delete(USERNAME_COOKIE);
}

export function applyAccessCookie(response: NextResponse, accessToken: string) {
  response.cookies.set(ACCESS_COOKIE, accessToken, secureCookie);
}

export function applyRefreshCookie(response: NextResponse, refreshToken: string) {
  response.cookies.set(REFRESH_COOKIE, refreshToken, secureCookie);
}
