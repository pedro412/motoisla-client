import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { applyAccessCookie, applyRefreshCookie, refreshAccessToken } from "@/lib/auth/server-session";

export async function POST() {
  const cookieStore = await cookies();
  const refresh = cookieStore.get("mi_refresh")?.value;

  if (!refresh) {
    return NextResponse.json(
      { code: "unauthenticated", detail: "No refresh token available.", fields: {} },
      { status: 401 },
    );
  }

  const tokens = await refreshAccessToken(refresh);
  if (!tokens) {
    return NextResponse.json(
      { code: "token_refresh_failed", detail: "No fue posible renovar la sesión.", fields: {} },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  applyAccessCookie(response, tokens.access);
  applyRefreshCookie(response, tokens.refresh);
  return response;
}
