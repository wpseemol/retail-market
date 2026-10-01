import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { decryptSecret } from "./secretBox.js";

export const SOCIAL_PROVIDERS = ["google", "facebook", "apple"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export function isSocialProvider(value: unknown): value is SocialProvider {
  return (SOCIAL_PROVIDERS as readonly unknown[]).includes(value);
}

export type SocialProviderConfig = {
  provider: SocialProvider;
  /** Enabled in the dashboard AND has the credentials login needs. */
  enabled: boolean;
  clientId: string | null;
  clientSecret: string | null;
  teamId: string | null;
  keyId: string | null;
  privateKey: string | null;
};

type Row = Awaited<ReturnType<typeof prisma.socialLoginProvider.findMany>>[number];

const CACHE_MS = 30_000;
let cache: { at: number; rows: Map<string, Row> } | null = null;

export function invalidateSocialLoginCache() {
  cache = null;
}

async function loadRows(): Promise<Map<string, Row>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const rows = await prisma.socialLoginProvider.findMany();
  const map = new Map(rows.map((r) => [r.provider, r]));
  cache = { at: Date.now(), rows: map };
  return map;
}

function toConfig(provider: SocialProvider, row: Row | undefined): SocialProviderConfig {
  // Before Google is configured in the dashboard, keep the GOOGLE_CLIENT_ID env behaviour.
  if (!row && provider === "google") {
    return {
      provider,
      enabled: Boolean(env.googleClientId),
      clientId: env.googleClientId || null,
      clientSecret: null,
      teamId: null,
      keyId: null,
      privateKey: null,
    };
  }

  const clientId = row?.client_id?.trim() || null;
  const clientSecret = decryptSecret(row?.client_secret_enc);
  const hasRequired =
    provider === "facebook" ? Boolean(clientId && clientSecret) : Boolean(clientId);

  return {
    provider,
    enabled: Boolean(row?.is_enabled) && hasRequired,
    clientId,
    clientSecret,
    teamId: row?.team_id ?? null,
    keyId: row?.key_id ?? null,
    privateKey: decryptSecret(row?.private_key_enc),
  };
}

export async function getSocialProviderConfig(
  provider: SocialProvider,
): Promise<SocialProviderConfig> {
  const rows = await loadRows();
  return toConfig(provider, rows.get(provider));
}

/** Safe for the storefront: enabled flags + public client IDs only. */
export async function getPublicSocialProviders() {
  const rows = await loadRows();
  const out = {} as Record<SocialProvider, { enabled: boolean; client_id: string | null }>;
  for (const provider of SOCIAL_PROVIDERS) {
    const cfg = toConfig(provider, rows.get(provider));
    out[provider] = {
      enabled: cfg.enabled,
      client_id: cfg.enabled ? cfg.clientId : null,
    };
  }
  return out;
}
