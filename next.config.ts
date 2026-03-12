import type { NextConfig } from "next";


function buildRemotePatterns() {
  const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.trim();
  if (!mediaBaseUrl) {
    return [];
  }

  try {
    const parsed = new URL(mediaBaseUrl);
    return [
      {
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: "/**",
      },
    ];
  } catch {
    return [];
  }
}

function buildCspImgSrc() {
  const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.trim();
  if (!mediaBaseUrl) {
    return "img-src 'self' data: blob:";
  }
  try {
    const { origin } = new URL(mediaBaseUrl);
    return `img-src 'self' data: blob: ${origin}`;
  } catch {
    return "img-src 'self' data: blob:";
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: buildRemotePatterns(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              buildCspImgSrc(),
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
