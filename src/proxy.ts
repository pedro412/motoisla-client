import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_COOKIE, ROLE_COOKIE } from "@/lib/auth/cookies";

function redirectByRole(request: NextRequest) {
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  if (role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/reports", request.url));
  }
  return NextResponse.redirect(new URL("/pos", request.url));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccess = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  const isPrivatePath =
    pathname.startsWith("/pos") ||
    pathname.startsWith("/purchases") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/investors") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/ventas") ||
    pathname.startsWith("/apartados");

  if (isPrivatePath && !hasAccess) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/admin") && hasAccess && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/pos", request.url));
  }

  if ((pathname.startsWith("/pos") || pathname.startsWith("/ventas") || pathname.startsWith("/apartados")) && hasAccess && role === "INVESTOR") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/products") && hasAccess && role === "INVESTOR") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/investors") && hasAccess && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/pos", request.url));
  }

  if (pathname.startsWith("/login") && hasAccess) {
    return redirectByRole(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/pos/:path*", "/purchases/:path*", "/products/:path*", "/investors/:path*", "/admin/:path*", "/dashboard/:path*", "/ventas/:path*", "/apartados/:path*"],
};
