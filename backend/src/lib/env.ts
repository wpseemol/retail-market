import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const required = ["DATABASE_URL", "JWT_SECRET"] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[env] Missing ${key} — set it in backend/.env`);
  }
}

export const env = {
  port: Number(process.env.PORT) || 8001,
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
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
};
