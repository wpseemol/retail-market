import "../lib/env.js";
import { z } from "zod";

/**
 * Object storage for uploaded media.
 * `local` keeps files under `uploads/` (development).
 * `s3` streams them to MinIO, Cloudflare R2, or AWS S3 and does not keep a copy on this disk.
 */

const httpUrl = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be an http(s) URL");

function refuse(message: string): never {
  console.error(`[storage] ${message} Refusing to start.`);
  process.exit(1);
}

const driverName = (process.env.STORAGE_DRIVER ?? "local").trim().toLowerCase();

export type LocalStorageConfig = {
  driver: "local";
  /** Set when this process should still build URLs for rows already stored on S3/R2. */
  publicBaseUrl: string | null;
};

export type S3StorageConfig = {
  driver: "s3";
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  /** Required for MinIO. AWS and R2 can set this to false. */
  forcePathStyle: boolean;
  publicBaseUrl: string;
  /** Value written to `medias.disk`. R2 when the endpoint is Cloudflare's. */
  objectDisk: "s3" | "r2";
};

export type StorageConfig = LocalStorageConfig | S3StorageConfig;

function optionalPublicBase(): string | null {
  const raw = process.env.S3_PUBLIC_BASE_URL?.trim() ?? "";
  if (!raw) return null;
  const parsed = httpUrl.safeParse(raw);
  if (!parsed.success) refuse("S3_PUBLIC_BASE_URL must be an http(s) URL.");
  return parsed.data.replace(/\/$/, "");
}

function forcePathStyle(): boolean {
  const raw = (process.env.S3_FORCE_PATH_STYLE ?? "true").trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  refuse("S3_FORCE_PATH_STYLE must be true or false.");
}

const s3EnvSchema = z.object({
  S3_ENDPOINT: httpUrl,
  S3_REGION: z.string().trim().min(1).max(64),
  S3_BUCKET: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine((value) => !/[\s/\\]/.test(value) && !value.includes(".."), "Invalid bucket name"),
  S3_ACCESS_KEY: z.string().trim().min(1).max(512),
  S3_SECRET_KEY: z.string().trim().min(1).max(512),
  S3_PUBLIC_BASE_URL: httpUrl,
});

function loadConfig(): StorageConfig {
  if (driverName === "local") {
    return { driver: "local", publicBaseUrl: optionalPublicBase() };
  }
  if (driverName !== "s3") {
    refuse("STORAGE_DRIVER must be local or s3.");
  }

  const parsed = s3EnvSchema.safeParse({
    S3_ENDPOINT: process.env.S3_ENDPOINT?.trim() ?? "",
    S3_REGION: process.env.S3_REGION?.trim() || "auto",
    S3_BUCKET: process.env.S3_BUCKET?.trim() ?? "",
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY?.trim() ?? "",
    S3_SECRET_KEY: process.env.S3_SECRET_KEY?.trim() ?? "",
    S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL?.trim() ?? "",
  });
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "S3")))];
    refuse(`STORAGE_DRIVER=s3 needs valid ${fields.join(", ")}.`);
  }

  const endpoint = parsed.data.S3_ENDPOINT.replace(/\/$/, "");
  let objectDisk: "s3" | "r2" = "s3";
  try {
    if (new URL(endpoint).hostname.endsWith("r2.cloudflarestorage.com")) objectDisk = "r2";
  } catch {
    objectDisk = "s3";
  }

  return {
    driver: "s3",
    endpoint,
    region: parsed.data.S3_REGION,
    bucket: parsed.data.S3_BUCKET,
    accessKey: parsed.data.S3_ACCESS_KEY,
    secretKey: parsed.data.S3_SECRET_KEY,
    forcePathStyle: forcePathStyle(),
    publicBaseUrl: parsed.data.S3_PUBLIC_BASE_URL.replace(/\/$/, ""),
    objectDisk,
  };
}

export const storageConfig: StorageConfig = loadConfig();

/** `medias.disk` for a file written by the active driver. Local files stay `public` (served from `/uploads`). */
export function currentMediaDisk(): "public" | "s3" | "r2" {
  return storageConfig.driver === "s3" ? storageConfig.objectDisk : "public";
}
