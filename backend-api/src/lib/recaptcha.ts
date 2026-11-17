import { prisma } from "./prisma.js";
import { env } from "./env.js";
import { decryptSecret } from "./secretBox.js";

export type RecaptchaVersion = "v2" | "v3";

export type RecaptchaPublicConfig = {
  enabled: boolean;
  version?: RecaptchaVersion;
  site_key?: string;
};

export type RecaptchaRow = {
  is_enabled: boolean;
  version: string;
  site_key: string | null;
  secret_key_enc: string | null;
  v3_min_score: number;
};

const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
/** Google tokens are short; reject oversized payloads before calling Google. */
const MAX_CAPTCHA_TOKEN_LEN = 4096;
const SITEVERIFY_TIMEOUT_MS = 8_000;

let cache: { at: number; row: RecaptchaRow | null } = { at: 0, row: null };
const CACHE_MS = 15_000;

export function invalidateRecaptchaCache() {
  cache = { at: 0, row: null };
}

export async function ensureRecaptchaSettings() {
  return prisma.recaptchaSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

async function loadRow(): Promise<RecaptchaRow | null> {
  const now = Date.now();
  if (cache.at && now - cache.at < CACHE_MS) return cache.row;
  const row = await prisma.recaptchaSettings.findUnique({ where: { id: 1 } });
  cache = { at: now, row };
  return row;
}

export function isRecaptchaVersion(value: string): value is RecaptchaVersion {
  return value === "v2" || value === "v3";
}

export function recaptchaReady(row: RecaptchaRow | null | undefined): boolean {
  if (!row?.is_enabled) return false;
  if (!row.site_key?.trim()) return false;
  if (!row.secret_key_enc) return false;
  if (!isRecaptchaVersion(row.version)) return false;
  return true;
}

/** Public config for login/register UIs — never includes the secret. */
export async function getPublicCaptchaConfig(): Promise<RecaptchaPublicConfig> {
  const row = await loadRow();
  if (!recaptchaReady(row) || !row) {
    return { enabled: false };
  }
  return {
    enabled: true,
    version: row.version as RecaptchaVersion,
    site_key: row.site_key!,
  };
}

type SiteverifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export type CaptchaCheckResult =
  | { ok: true }
  | { ok: false; status: 400; body: { message: string; code: string } };

function fail(message: string, code = "CAPTCHA_FAILED"): CaptchaCheckResult {
  return { ok: false, status: 400, body: { message, code } };
}

/** Hostnames allowed for Google siteverify `hostname` (CORS + public URLs). */
function allowedCaptchaHostnames(): Set<string> {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  for (const origin of env.corsOrigins) {
    try {
      const host = new URL(origin).hostname.toLowerCase();
      if (host) hosts.add(host);
    } catch {
      /* ignore bad origin */
    }
  }
  for (const raw of [env.frontendUrl, env.publicBaseUrl]) {
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (host) hosts.add(host);
    } catch {
      /* ignore */
    }
  }
  return hosts;
}

function hostnameAllowed(hostname: string | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  const allowed = allowedCaptchaHostnames();
  if (allowed.has(host)) return true;
  // Accept bare apex when www variant is listed (and vice versa).
  if (host.startsWith("www.") && allowed.has(host.slice(4))) return true;
  if (allowed.has(`www.${host}`)) return true;
  return false;
}

export type CaptchaVerifyOptions = {
  token: unknown;
  remoteIp?: string | null;
  /** Expected v3 action (e.g. login / register / dashboard_login). Ignored for v2. */
  expectedAction?: string;
};

/**
 * When reCAPTCHA is enabled and ready, require a valid `captchaToken`.
 * When disabled / incomplete, skip (dev-friendly until super admin configures).
 */
export async function requireCaptchaIfEnabled(
  tokenOrOpts: unknown,
  remoteIp?: string | null,
  expectedAction?: string,
): Promise<CaptchaCheckResult> {
  const opts: CaptchaVerifyOptions =
    tokenOrOpts &&
    typeof tokenOrOpts === "object" &&
    "token" in (tokenOrOpts as object)
      ? (tokenOrOpts as CaptchaVerifyOptions)
      : { token: tokenOrOpts, remoteIp, expectedAction };

  const row = await loadRow();
  if (!recaptchaReady(row) || !row) {
    return { ok: true };
  }

  const captchaToken =
    typeof opts.token === "string" ? opts.token.trim() : "";
  if (!captchaToken) {
    return fail(
      "Please complete the captcha and try again.",
      "CAPTCHA_REQUIRED",
    );
  }
  if (captchaToken.length > MAX_CAPTCHA_TOKEN_LEN) {
    return fail("Captcha token is invalid.", "CAPTCHA_FAILED");
  }

  const secret = decryptSecret(row.secret_key_enc);
  if (!secret) {
    return fail("Captcha is misconfigured. Contact support.");
  }

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", captchaToken);
  if (opts.remoteIp) params.set("remoteip", opts.remoteIp);

  let data: SiteverifyResponse;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SITEVERIFY_TIMEOUT_MS);
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) {
      return fail("Could not verify captcha. Please try again.");
    }
    data = (await res.json()) as SiteverifyResponse;
  } catch {
    return fail("Could not verify captcha. Please try again.");
  }

  if (!data.success) {
    return fail("Captcha verification failed. Please try again.");
  }

  // Reject tokens issued for another site/key domain.
  if (!hostnameAllowed(data.hostname)) {
    return fail("Captcha verification failed. Please try again.");
  }

  if (row.version === "v3") {
    const score = typeof data.score === "number" ? data.score : 0;
    const min = Number.isFinite(row.v3_min_score) ? row.v3_min_score : 0.5;
    if (score < min) {
      return fail("Captcha score too low. Please try again.");
    }
    const expected = opts.expectedAction?.trim();
    if (expected && data.action && data.action !== expected) {
      return fail("Captcha verification failed. Please try again.");
    }
  }

  return { ok: true };
}
