import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_COOKIE, ROLE_COOKIE } from "@/lib/auth/cookies";

function redirectByRole(request: NextRequest) {
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  if (role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/reports", request.url));
  }
  if (role === "INVESTOR") {
    return NextResponse.redirect(new URL("/investor", request.url));
  }
  return NextResponse.redirect(new URL("/pos", request.url));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccess = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  const isInvestorSelfPath = pathname === "/investor" || pathname.startsWith("/investor/");
  const isPrivatePath =
    isInvestorSelfPath ||
    pathname.startsWith("/pos") ||
    pathname.startsWith("/purchases") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/expenses") ||
    pathname.startsWith("/investors") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/ventas") ||
    pathname.startsWith("/apartados");

  if (isPrivatePath && !hasAccess) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isInvestorSelfPath && hasAccess && role !== "INVESTOR") {
    return redirectByRole(request);
  }

  if (hasAccess && role === "INVESTOR" && !isInvestorSelfPath && pathname !== "/login") {
    return NextResponse.redirect(new URL("/investor", request.url));
  }

  if (pathname.startsWith("/admin") && hasAccess && role !== "ADMIN") {
    return redirectByRole(request);
  }

  if (pathname.startsWith("/investors") && hasAccess && role !== "ADMIN") {
    return redirectByRole(request);
  }

  if (pathname.startsWith("/expenses") && hasAccess && role !== "ADMIN") {
    return redirectByRole(request);
  }

  if (pathname.startsWith("/login") && hasAccess) {
    return redirectByRole(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/investor/:path*",
    "/pos/:path*",
    "/purchases/:path*",
    "/products/:path*",
    "/expenses/:path*",
    "/investors/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/ventas/:path*",
    "/apartados/:path*",
  ],
};
