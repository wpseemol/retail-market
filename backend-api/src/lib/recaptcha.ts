import { prisma } from "./prisma.js";
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
  "error-codes"?: string[];
};

export type CaptchaCheckResult =
  | { ok: true }
  | { ok: false; status: 400; body: { message: string; code: string } };

/**
 * When reCAPTCHA is enabled and ready, require a valid `captchaToken`.
 * When disabled / incomplete, skip (dev-friendly until super admin configures).
 */
export async function requireCaptchaIfEnabled(
  token: unknown,
  remoteIp?: string | null,
): Promise<CaptchaCheckResult> {
  const row = await loadRow();
  if (!recaptchaReady(row) || !row) {
    return { ok: true };
  }

  const captchaToken = typeof token === "string" ? token.trim() : "";
  if (!captchaToken) {
    return {
      ok: false,
      status: 400,
      body: {
        message: "Please complete the captcha and try again.",
        code: "CAPTCHA_REQUIRED",
      },
    };
  }

  const secret = decryptSecret(row.secret_key_enc);
  if (!secret) {
    return {
      ok: false,
      status: 400,
      body: {
        message: "Captcha is misconfigured. Contact support.",
        code: "CAPTCHA_FAILED",
      },
    };
  }

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", captchaToken);
  if (remoteIp) params.set("remoteip", remoteIp);

  let data: SiteverifyResponse;
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    data = (await res.json()) as SiteverifyResponse;
  } catch {
    return {
      ok: false,
      status: 400,
      body: {
        message: "Could not verify captcha. Please try again.",
        code: "CAPTCHA_FAILED",
      },
    };
  }

  if (!data.success) {
    return {
      ok: false,
      status: 400,
      body: {
        message: "Captcha verification failed. Please try again.",
        code: "CAPTCHA_FAILED",
      },
    };
  }

  if (row.version === "v3") {
    const score = typeof data.score === "number" ? data.score : 0;
    const min = Number.isFinite(row.v3_min_score) ? row.v3_min_score : 0.5;
    if (score < min) {
      return {
        ok: false,
        status: 400,
        body: {
          message: "Captcha score too low. Please try again.",
          code: "CAPTCHA_FAILED",
        },
      };
    }
  }

  return { ok: true };
}
