import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const apiUrl = new URL(
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8001",
);
const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL
  ? new URL(process.env.NEXT_PUBLIC_MEDIA_URL)
  : null;

const toPattern = (url: URL) => ({
  protocol: url.protocol.replace(":", "") as "http" | "https",
  hostname: url.hostname,
  port: url.port,
  pathname: "/uploads/**",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  // Monorepo root, so the production image runs `node frontend/server.js`.
  outputFileTracingRoot: path.join(appDir, ".."),
  images: {
    remotePatterns: [toPattern(apiUrl), ...(mediaUrl ? [toPattern(mediaUrl)] : [])],
    // Next 16 refuses to optimize images from private IPs (localhost) unless allowed.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    // The optimizer fetches upload URLs from inside the server; in Docker a
    // localhost API URL is unreachable there, so browsers load them directly.
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "1",
  },
};

export default nextConfig;
