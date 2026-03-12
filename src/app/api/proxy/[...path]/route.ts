import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import { applyAccessCookie, applyRefreshCookie, refreshAccessToken } from "@/lib/auth/server-session";
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "@/lib/config/env";

async function proxyRequest(request: Request, path: string[], accessToken?: string) {
  const normalizedPath = path.length ? `${path.join("/")}/` : "";
  const upstreamUrl = new URL(`${API_BASE_URL}/${normalizedPath}`);
  const incomingUrl = new URL(request.url);
  upstreamUrl.search = incomingUrl.search;

  const headers = new Headers();
  headers.set("Accept", "application/json");

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const bodyText = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(upstreamUrl.toString(), {
      method: request.method,
      headers,
      body: bodyText,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function toNextResponse(response: Response) {
  if (response.status === 204 || response.status === 205 || response.status === 304) {
    return new NextResponse(null, {
      status: response.status,
    });
  }

  const contentType = response.headers.get("content-type") ?? "application/json";
  const payloadText = await response.text();

  return new NextResponse(payloadText, {
    status: response.status,
    headers: {
      "Content-Type": contentType,
    },
  });
}

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const cookieStore = await cookies();
  const access = cookieStore.get(ACCESS_COOKIE)?.value;
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;

  let upstream = await proxyRequest(request, path, access);

  if (upstream.status === 401 && refresh) {
    const tokens = await refreshAccessToken(refresh);
    if (tokens) {
      upstream = await proxyRequest(request, path, tokens.access);
      const nextResponse = await toNextResponse(upstream);
      applyAccessCookie(nextResponse, tokens.access);
      applyRefreshCookie(nextResponse, tokens.refresh);
      return nextResponse;
    }
  }

  return toNextResponse(upstream);
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context);
}
