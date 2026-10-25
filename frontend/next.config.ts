import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** Live API. Used for images and as the Vercel fallback when the env var is unset. */
const PRODUCTION_API_URL = "https://niyenin-api.wpseemol.site";

const resolvedApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL ? PRODUCTION_API_URL : "http://localhost:8001");

const apiUrl = new URL(resolvedApiUrl);
const productionApiUrl = new URL(PRODUCTION_API_URL);
const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL
  ? new URL(process.env.NEXT_PUBLIC_MEDIA_URL)
  : null;

const toPattern = (url: URL, pathname: string) => ({
  protocol: url.protocol.replace(":", "") as "http" | "https",
  hostname: url.hostname,
  port: url.port,
  pathname,
});

/** `NEXT_PUBLIC_MEDIA_URL` may be the API (`/uploads`) or an object-storage base (`/niyenin-media`). */
function mediaPathname(url: URL): string {
  const prefix = url.pathname.replace(/\/$/, "");
  return prefix ? `${prefix}/**` : "/**";
}

function isLoopbackHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // Docker sets NEXT_STANDALONE=1. A normal `next start` cannot serve standalone output.
  ...(process.env.VERCEL || process.env.NEXT_STANDALONE !== "1"
    ? {}
    : { output: "standalone" as const }),
  // Monorepo root, so the Docker image runs `node frontend/server.js`.
  // On Vercel the upload is only this app, so the parent directory is not available.
  ...(process.env.VERCEL
    ? {}
    : { outputFileTracingRoot: path.join(appDir, "..") }),
  env: {
    NEXT_PUBLIC_API_URL: resolvedApiUrl,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=15552000; includeSubDomains",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      toPattern(apiUrl, "/uploads/**"),
      ...(apiUrl.hostname === productionApiUrl.hostname
        ? []
        : [toPattern(productionApiUrl, "/uploads/**")]),
      ...(mediaUrl ? [toPattern(mediaUrl, mediaPathname(mediaUrl))] : []),
    ],
    // `next start` is production, but a local API is still on loopback.
    // Public image hosts stay blocked. remotePatterns still limit the path.
    dangerouslyAllowLocalIP:
      isLoopbackHost(apiUrl.hostname) ||
      (mediaUrl != null && isLoopbackHost(mediaUrl.hostname)),
    // The optimizer fetches upload URLs from inside the server; in Docker a
    // localhost API URL is unreachable there, so browsers load them directly.
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "1",
  },
};

export default nextConfig;
