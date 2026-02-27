import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE, ROLE_COOKIE, USERNAME_COOKIE } from "@/lib/auth/cookies";
import type { Role } from "@/lib/types/auth";

export async function GET() {
  const cookieStore = await cookies();
  const access = cookieStore.get(ACCESS_COOKIE)?.value;
  const role = cookieStore.get(ROLE_COOKIE)?.value as Role | undefined;
  const username = cookieStore.get(USERNAME_COOKIE)?.value;

  if (!access) {
    return NextResponse.json({ session: { isAuthenticated: false } });
  }

  return NextResponse.json({
    session: {
      isAuthenticated: true,
      role,
      username,
    },
  });
}
