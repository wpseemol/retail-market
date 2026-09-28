import type { NextConfig } from "next";

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
  images: {
    remotePatterns: [toPattern(apiUrl), ...(mediaUrl ? [toPattern(mediaUrl)] : [])],
    // Next 16 refuses to optimize images from private IPs (localhost) unless allowed.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
  },
};

export default nextConfig;
