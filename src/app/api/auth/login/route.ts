import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { saveSessionCookies } from "@/lib/auth/server-session";
import { API_BASE_URL } from "@/lib/config/env";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username?.trim();
  const password = body.password;

  if (!username || !password) {
    return NextResponse.json(
      {
        code: "invalid_credentials",
        detail: "Username y password son obligatorios.",
        fields: { username: !username ? ["Required"] : [], password: !password ? ["Required"] : [] },
      },
      { status: 400 },
    );
  }

  const upstream = await fetch(`${API_BASE_URL}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  const payload = await upstream.json();

  if (!upstream.ok) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const accessToken = payload.access as string;
  const refreshToken = payload.refresh as string;
  const cookieStore = await cookies();
  const role = await saveSessionCookies({ cookieStore, accessToken, refreshToken, username });

  return NextResponse.json({
    session: {
      isAuthenticated: true,
      role,
      username,
    },
  });
}
