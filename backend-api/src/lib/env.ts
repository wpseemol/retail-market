import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const required = ["DATABASE_URL", "JWT_SECRET"] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[env] Missing ${key} — set it in backend-api/.env`);
  }
}

export const env = {
  port: Number(process.env.PORT) || 8001,
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  /**
   * Encrypts secrets stored in the DB (social login client secrets / keys).
   * Falls back to JWT_SECRET; changing it makes stored secrets unreadable.
   */
  settingsEncryptionKey:
    process.env.SETTINGS_ENCRYPTION_KEY?.trim() ||
    process.env.JWT_SECRET ||
    "dev-only-change-me",
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
  corsOrigins: (
    process.env.CORS_ORIGINS ??
    "http://localhost:3000,http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  /** Public base URL for uploaded media (e.g. http://localhost:8001). */
  publicBaseUrl: (
    process.env.PUBLIC_API_URL ??
    `http://localhost:${Number(process.env.PORT) || 8001}`
  ).replace(/\/$/, ""),
  /** Storefront origin — payment gateways redirect customers back here. */
  frontendUrl: (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, ""),
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
};
