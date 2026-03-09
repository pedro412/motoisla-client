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

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: buildRemotePatterns(),
  },
};

export default nextConfig;
