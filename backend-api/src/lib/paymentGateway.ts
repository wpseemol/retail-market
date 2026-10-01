import { env } from "./env.js";
import { prisma } from "./prisma.js";
import { decryptSecret } from "./secretBox.js";

export type SslcommerzConfig = {
  storeId: string;
  storePassword: string;
  isLive: boolean;
  source: "dashboard" | "env";
};

type Row = Awaited<ReturnType<typeof prisma.paymentGateway.findUnique>>;

const CACHE_MS = 30_000;
let cache: { at: number; row: Row } | null = null;

export function invalidatePaymentGatewayCache() {
  cache = null;
}

export async function loadSslcommerzRow(): Promise<Row> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.row;
  const row = await prisma.paymentGateway.findUnique({ where: { provider: "sslcommerz" } });
  cache = { at: Date.now(), row };
  return row;
}

export function envSslcommerzConfig(): SslcommerzConfig | null {
  const { storeId, storePassword, isLive } = env.sslcommerz;
  return storeId && storePassword ? { storeId, storePassword, isLive, source: "env" } : null;
}

/**
 * Dashboard settings win once saved. A saved-but-disabled row turns online
 * payment off; with no row at all the SSLCZ_* env values are used.
 */
export async function getSslcommerzConfig(): Promise<SslcommerzConfig | null> {
  const row = await loadSslcommerzRow();
  if (!row) return envSslcommerzConfig();
  if (!row.is_enabled) return null;
  const storePassword = decryptSecret(row.store_password_enc);
  if (!row.store_id || !storePassword) return null;
  return { storeId: row.store_id, storePassword, isLive: row.is_live, source: "dashboard" };
}

export function sslcommerzBaseUrl(isLive: boolean) {
  return isLive ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";
}
