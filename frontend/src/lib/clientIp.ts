import { headers } from "next/headers";
import { isIP } from "node:net";

/**
 * Shopper address for the API rate limiter.
 * Vercel appends the real client as the last `x-forwarded-for` hop.
 * The API trusts this only when `PROXY_IP_SECRET` matches. Never put that
 * secret in a `NEXT_PUBLIC_` variable.
 */
export async function trustedClientHeaders(): Promise<Record<string, string>> {
  const secret = process.env.PROXY_IP_SECRET?.trim();
  if (!secret) return {};

  const incoming = await headers();
  const forwarded = incoming.get("x-forwarded-for") ?? "";
  const parts = forwarded
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const ip = (parts.at(-1) ?? incoming.get("x-real-ip") ?? "").replace(/^\[|\]$/g, "");
  if (!ip || ip.length > 45 || isIP(ip) === 0) return {};

  return {
    "X-Client-Ip-Secret": secret,
    "X-Real-Client-Ip": ip,
  };
}
