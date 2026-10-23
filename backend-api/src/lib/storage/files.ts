import fs from "node:fs";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storageConfig } from "../../config/storage.config.js";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

/** One path segment stored under `medias.file_path` / `medias.file_name` (UUID names, not user input). */
const KEY_PART = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;

export class StorageError extends Error {
  readonly code:
    | "STORAGE_PUT_FAILED"
    | "STORAGE_DELETE_FAILED"
    | "STORAGE_READ_FAILED"
    | "STORAGE_KEY_INVALID"
    | "STORAGE_UNAVAILABLE";

  constructor(code: StorageError["code"], message: string) {
    super(message);
    this.name = "StorageError";
    this.code = code;
  }
}

let client: S3Client | null = null;

function s3Client(): S3Client {
  if (storageConfig.driver !== "s3") {
    throw new StorageError("STORAGE_UNAVAILABLE", "Object storage is not configured");
  }
  if (!client) {
    client = new S3Client({
      region: storageConfig.region,
      endpoint: storageConfig.endpoint,
      forcePathStyle: storageConfig.forcePathStyle,
      credentials: {
        accessKeyId: storageConfig.accessKey,
        secretAccessKey: storageConfig.secretKey,
      },
      // MinIO rejects the default flexible checksum headers.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

function errorName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error && typeof error.name === "string") {
    return error.name;
  }
  return "Error";
}

/** `products/uuid.webp` — rejects `..`, slashes in the file name, and empty segments. */
export function mediaObjectKey(filePath: string, fileName: string): string | null {
  const dir = filePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const name = fileName.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!name || name.includes("/") || dir.includes("..") || name.includes("..")) return null;
  const parts = dir.length === 0 ? [] : dir.split("/");
  if (parts.some((part) => !KEY_PART.test(part)) || !KEY_PART.test(name)) return null;
  return parts.length === 0 ? name : `${parts.join("/")}/${name}`;
}

function localAbsolute(key: string): string | null {
  const absolute = path.resolve(UPLOADS_ROOT, ...key.split("/"));
  if (absolute !== UPLOADS_ROOT && !absolute.startsWith(UPLOADS_ROOT + path.sep)) return null;
  return absolute;
}

/** Create an upload directory only for the local driver, so S3 mode leaves the disk empty. */
export function ensureLocalUploadDir(dir: string): void {
  if (storageConfig.driver !== "local") return;
  fs.mkdirSync(dir, { recursive: true });
}

export function readUploadSource(source: Buffer | string): Buffer {
  if (Buffer.isBuffer(source)) return source;
  return fs.readFileSync(source);
}

/** Deletes a multer temp file. Memory uploads have no path. */
export function discardUploadSource(source: Buffer | string | undefined): void {
  if (!source || Buffer.isBuffer(source)) return;
  try {
    fs.unlinkSync(source);
  } catch {
    /* already gone */
  }
}

/**
 * Writes the already-resized bytes. S3 mode uploads the buffer and does not touch `uploads/`.
 * `absolutePath` is a real path for the local driver and `s3://bucket/key` otherwise.
 */
export async function saveMediaFile(input: {
  absoluteDir: string;
  relativeDir: string;
  fileName: string;
  body: Buffer;
  contentType: string;
}): Promise<{ absolutePath: string }> {
  const key = mediaObjectKey(input.relativeDir, input.fileName);
  if (!key) throw new StorageError("STORAGE_KEY_INVALID", "Invalid media path");
  if (input.body.length === 0) {
    throw new StorageError("STORAGE_PUT_FAILED", "Refusing to store an empty file");
  }

  if (storageConfig.driver === "s3") {
    try {
      await s3Client().send(
        new PutObjectCommand({
          Bucket: storageConfig.bucket,
          Key: key,
          Body: input.body,
          ContentType: input.contentType,
          ContentLength: input.body.length,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    } catch (error) {
      console.error(`[storage] put failed for ${key}: ${errorName(error)}`);
      throw new StorageError("STORAGE_PUT_FAILED", "Failed to store the file");
    }
    return { absolutePath: `s3://${storageConfig.bucket}/${key}` };
  }

  fs.mkdirSync(input.absoluteDir, { recursive: true });
  const absolutePath = path.resolve(input.absoluteDir, input.fileName);
  const root = path.resolve(input.absoluteDir);
  if (!absolutePath.startsWith(root + path.sep)) {
    throw new StorageError("STORAGE_KEY_INVALID", "Invalid media path");
  }
  fs.writeFileSync(absolutePath, input.body);
  return { absolutePath };
}

/** Best-effort delete. S3 mode removes the object and any leftover local file with the same key. */
export async function deleteMediaFile(filePath: string, fileName: string): Promise<void> {
  const key = mediaObjectKey(filePath, fileName);
  if (!key) return;

  if (storageConfig.driver === "s3") {
    try {
      await s3Client().send(
        new DeleteObjectCommand({
          Bucket: storageConfig.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      console.error(`[storage] delete failed for ${key}: ${errorName(error)}`);
    }
  }

  const absolute = localAbsolute(key);
  if (!absolute) return;
  try {
    if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  } catch {
    /* already gone */
  }
}

/** Reads a stored object. `disk` selects S3/R2 vs the local uploads folder. */
export async function readMediaFile(
  filePath: string,
  fileName: string,
  maxBytes: number,
  disk?: string | null,
): Promise<Buffer | null> {
  const key = mediaObjectKey(filePath, fileName);
  if (!key) return null;
  const remote = disk === "s3" || disk === "r2" || (disk == null && storageConfig.driver === "s3");
  if (remote) {
    if (storageConfig.driver !== "s3") return null;
    try {
      const out = await s3Client().send(
        new GetObjectCommand({
          Bucket: storageConfig.bucket,
          Key: key,
        }),
      );
      if (out.ContentLength !== undefined && out.ContentLength > maxBytes) return null;
      const body = out.Body;
      if (!body || typeof body.transformToByteArray !== "function") return null;
      const bytes = await body.transformToByteArray();
      if (bytes.byteLength > maxBytes) return null;
      return Buffer.from(bytes);
    } catch (error) {
      console.error(`[storage] read failed for ${key}: ${errorName(error)}`);
      return null;
    }
  }

  const absolute = localAbsolute(key);
  if (!absolute) return null;
  try {
    const stat = fs.statSync(absolute);
    if (!stat.isFile() || stat.size > maxBytes) return null;
    return fs.readFileSync(absolute);
  } catch {
    return null;
  }
}

/**
 * Short-lived GET URL for a private object. Public media uses `S3_PUBLIC_BASE_URL` instead.
 * `expiresIn` is seconds, clamped to 1 minute–1 hour.
 */
export async function presignMediaDownload(
  filePath: string,
  fileName: string,
  expiresIn = 300,
): Promise<string> {
  if (storageConfig.driver !== "s3") {
    throw new StorageError("STORAGE_UNAVAILABLE", "Presigned URLs require STORAGE_DRIVER=s3");
  }
  const key = mediaObjectKey(filePath, fileName);
  if (!key) throw new StorageError("STORAGE_KEY_INVALID", "Invalid media path");
  const seconds = Math.min(3600, Math.max(60, Math.floor(expiresIn)));
  try {
    return await getSignedUrl(
      s3Client(),
      new GetObjectCommand({ Bucket: storageConfig.bucket, Key: key }),
      { expiresIn: seconds },
    );
  } catch (error) {
    console.error(`[storage] presign failed for ${key}: ${errorName(error)}`);
    throw new StorageError("STORAGE_READ_FAILED", "Failed to sign the download URL");
  }
}

/** Public URL for an `s3` or `r2` row. Returns null for local/`public` rows. */
export function publicObjectUrl(disk: string, filePath: string, fileName: string): string | null {
  if (disk !== "s3" && disk !== "r2") return null;
  const base = storageConfig.publicBaseUrl;
  if (!base) return null;
  const key = mediaObjectKey(filePath, fileName);
  if (!key) return null;
  return `${base}/${key.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}
