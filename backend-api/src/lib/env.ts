import path from "node:path";
import dotenv from "dotenv";

// `.env.dev` locally, `.env.prod` when NODE_ENV=production. A value already set
// by cPanel or the shell wins. `.env` only fills anything still missing (Prisma reads that name).
const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const isProduction = process.env.NODE_ENV === "production";
const MIN_SECRET_BYTES = 32;
const DEV_SECRET = "dev-only-change-me";

function positiveInt(raw: string | undefined, fallback: number) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:5173",
];

/** Live storefront and dashboard. Browsers send these without a trailing slash. */
const PRODUCTION_ORIGINS = [
  "https://niyenin-frontend.vercel.app",
  "https://niyenin-dashboard.vercel.app",
];

function corsOriginList(raw: string | undefined) {
  const fromEnv = (raw ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return [...new Set([...LOCAL_ORIGINS, ...PRODUCTION_ORIGINS, ...fromEnv])];
}

const required = ["DATABASE_URL", "JWT_SECRET"] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[env] Missing ${key} — set it in backend-api/.env`);
  }
}

// A guessable signing key lets anyone mint a super_admin token, so production must not start without real secrets.
if (isProduction) {
  const weak = (["JWT_SECRET", "SETTINGS_ENCRYPTION_KEY", "API_PUBLIC_KEY", "API_SECRET_KEY"] as const).filter(
    (key) => Buffer.byteLength(process.env[key]?.trim() ?? "", "utf8") < MIN_SECRET_BYTES,
  );
  if (weak.length > 0) {
    console.error(
      `[env] ${weak.join(", ")} must be set to at least ${MIN_SECRET_BYTES} bytes in production. Refusing to start.`,
    );
    process.exit(1);
  }
  if (!process.env.PROXY_IP_SECRET?.trim()) {
    console.warn(
      "[env] PROXY_IP_SECRET is empty. Storefront requests that pass through Vercel share one IP for rate limits. Set the same secret on the API and the storefront.",
    );
  }
}

export const env = {
  port: Number(process.env.PORT) || 8001,
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET?.trim() || DEV_SECRET,
  /**
   * Encrypts secrets stored in the DB (social login client secrets / keys).
   * Required in production; in development it falls back to JWT_SECRET.
   * Changing it makes stored secrets unreadable.
   */
  settingsEncryptionKey:
    process.env.SETTINGS_ENCRYPTION_KEY?.trim() ||
    (isProduction ? "" : process.env.JWT_SECRET?.trim() || DEV_SECRET),
  /** Short-lived access JWT (API Authorization header). Default / customers. */
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "1h",
  /** Long-lived refresh JWT — customers keep login ~1 year. */
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "365d",
  /**
   * Elevated dashboard staff (super_admin / admin / moderator):
   * short sessions — must re-auth often.
   */
  jwtStaffAccessExpiresIn: process.env.JWT_STAFF_ACCESS_EXPIRES_IN ?? "15m",
  jwtStaffRefreshExpiresIn: process.env.JWT_STAFF_REFRESH_EXPIRES_IN ?? "2h",
  /** Vendor dashboard sessions (longer than elevated staff). */
  jwtVendorAccessExpiresIn: process.env.JWT_VENDOR_ACCESS_EXPIRES_IN ?? "1h",
  jwtVendorRefreshExpiresIn: process.env.JWT_VENDOR_REFRESH_EXPIRES_IN ?? "7d",
  /** Google OAuth Web Client ID (same as NEXT_PUBLIC_GOOGLE_CLIENT_ID). */
  googleClientId: (process.env.GOOGLE_CLIENT_ID ?? "")
    .trim()
    .replace(/^["']|["']$/g, ""),
  corsOrigins: corsOriginList(process.env.CORS_ORIGINS),
  /** Identifies the storefront or dashboard. Sent with `X-Public-Key`. */
  apiPublicKey: (process.env.API_PUBLIC_KEY ?? "").trim(),
  /** Server-only. Sent with `X-Api-Secret`. Never put this in a browser bundle. */
  apiSecretKey: (process.env.API_SECRET_KEY ?? "").trim(),
  apiKeysEnforced:
    Boolean((process.env.API_PUBLIC_KEY ?? "").trim()) &&
    Boolean((process.env.API_SECRET_KEY ?? "").trim()),
  /** Public base URL for uploaded media (e.g. http://localhost:8001). */
  publicBaseUrl: (
    process.env.PUBLIC_API_URL ??
    `http://localhost:${Number(process.env.PORT) || 8001}`
  ).replace(/\/$/, ""),
  /** Storefront origin — payment gateways redirect customers back here. */
  frontendUrl: (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  /** Shared with the storefront's `REVALIDATE_SECRET`; empty → on-demand cache refresh is off. */
  revalidateSecret: (process.env.REVALIDATE_SECRET ?? "").trim(),
  /**
   * Shared with the storefront `PROXY_IP_SECRET`. When it matches
   * `X-Client-Ip-Secret`, rate limits use `X-Real-Client-Ip` (the Vercel hop).
   * Empty → limits use the TCP client (`req.ip`), which is correct for the
   * dashboard (browser → API) and for direct API calls.
   */
  proxyIpSecret: (process.env.PROXY_IP_SECRET ?? "").trim(),
  /**
   * Optional Redis / Upstash URL for shared rate limits and public GET cache.
   * Empty → in-memory store (correct for one Passenger process on Spaceship).
   */
  redisUrl: (process.env.REDIS_URL ?? "").trim(),
  /** Whole-process caps for paid outbound messages. One Passenger process. */
  outbound: {
    emailPerHour: positiveInt(process.env.EMAIL_MAX_PER_HOUR, 200),
    smsPerHour: positiveInt(process.env.SMS_MAX_PER_HOUR, 40),
    whatsappPerHour: positiveInt(process.env.WHATSAPP_MAX_PER_HOUR, 40),
  },
  /** SSLCOMMERZ hosted checkout. Sandbox unless SSLCZ_IS_LIVE=true. */
  sslcommerz: {
    storeId: process.env.SSLCZ_STORE_ID ?? "",
    storePassword: process.env.SSLCZ_STORE_PASSWORD ?? "",
    isLive: process.env.SSLCZ_IS_LIVE === "true",
  },
  /** Brand name shown in verification emails / SMS. */
  appName: process.env.APP_NAME ?? "Niyenin",
  /** New product reviews start as `pending` (moderation queue) instead of `approved`. */
  reviewsRequireApproval: process.env.REVIEWS_REQUIRE_APPROVAL === "true",
  /** SMTP for verification emails. Empty host → codes are logged to the console (dev). */
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "Niyenin <no-reply@niyenin.com>",
  },
  /**
   * SMS gateway for phone verification.
   * `console` logs codes (dev); `bulksmsbd` uses https://bulksmsbd.net.
   */
  sms: {
    provider: (process.env.SMS_PROVIDER ?? "console") as "console" | "bulksmsbd",
    apiKey: process.env.SMS_API_KEY ?? "",
    senderId: process.env.SMS_SENDER_ID ?? "",
    apiUrl: process.env.SMS_API_URL ?? "https://bulksmsbd.net/api/smsapi",
  },
  /**
   * WhatsApp OTP (Meta Cloud API or Twilio WhatsApp).
   * `console` logs codes (dev); set WHATSAPP_PROVIDER=meta_cloud with token + phone number id + template.
   */
  whatsapp: {
    provider: (process.env.WHATSAPP_PROVIDER ?? "console") as
      | "console"
      | "meta_cloud"
      | "twilio_whatsapp",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    accountSid: process.env.WHATSAPP_ACCOUNT_SID ?? "",
    templateName: process.env.WHATSAPP_TEMPLATE_NAME ?? "",
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en",
    apiVersion: process.env.WHATSAPP_API_VERSION ?? "v21.0",
    templateButtonParam: process.env.WHATSAPP_TEMPLATE_BUTTON_PARAM !== "false",
  },
};
