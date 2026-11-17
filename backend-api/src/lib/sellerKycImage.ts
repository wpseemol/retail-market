import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  AVATAR_ALLOWED_MIMES,
  detectAvatarImageType,
  type AvatarMime,
  type FinalizedAvatarResult,
} from "./avatarImage.js";
import { optimizeImageWithin } from "./imageOptimize.js";
import {
  discardUploadSource,
  ensureLocalUploadDir,
  readUploadSource,
  saveMediaFile,
  StorageError,
} from "./storage/files.js";

export const SELLER_KYC_IMAGES_DIR = path.resolve(process.cwd(), "uploads", "seller-kyc");
export const SELLER_KYC_IMAGES_RELATIVE = "seller-kyc";
export const SELLER_KYC_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const SELLER_KYC_IMAGE_MIN_BYTES = 32;

ensureLocalUploadDir(SELLER_KYC_IMAGES_DIR);

/** Sniff magic bytes, resize/re-encode to WebP, store under uploads/seller-kyc. */
export async function finalizeSellerKycImageUpload(
  source: Buffer | string,
  declaredMime?: string | null,
): Promise<FinalizedAvatarResult> {
  let buffer: Buffer;
  try {
    buffer = readUploadSource(source);
  } catch {
    return { ok: false, message: "Failed to read uploaded image", code: "SELLER_KYC_READ_FAILED" };
  }

  const fail = (message: string, code: string): FinalizedAvatarResult => {
    discardUploadSource(source);
    return { ok: false, message, code };
  };

  if (buffer.length < SELLER_KYC_IMAGE_MIN_BYTES) {
    return fail("Image file is empty or too small", "SELLER_KYC_TOO_SMALL");
  }
  if (buffer.length > SELLER_KYC_IMAGE_MAX_BYTES) {
    return fail("Each document image must be 2 MB or smaller", "SELLER_KYC_TOO_LARGE");
  }

  const detected = detectAvatarImageType(buffer);
  if (!detected) {
    return fail("Only JPEG, PNG, WebP, or GIF images are allowed", "SELLER_KYC_INVALID_TYPE");
  }
  if (
    declaredMime &&
    AVATAR_ALLOWED_MIMES.includes(declaredMime as AvatarMime) &&
    declaredMime !== detected.mime
  ) {
    return fail("File content does not match the declared image type", "SELLER_KYC_MIME_MISMATCH");
  }

  try {
    const optimized = await optimizeImageWithin(buffer, "sellerKyc", SELLER_KYC_IMAGE_MAX_BYTES);
    if (!optimized) {
      return fail("Each document image must be 2 MB or smaller after resize", "SELLER_KYC_TOO_LARGE");
    }
    const fileName = `${randomUUID()}${optimized.ext}`;
    const saved = await saveMediaFile({
      absoluteDir: SELLER_KYC_IMAGES_DIR,
      relativeDir: SELLER_KYC_IMAGES_RELATIVE,
      fileName,
      body: optimized.output,
      contentType: optimized.mime,
      isPrivate: true,
    });
    discardUploadSource(source);
    return {
      ok: true,
      detected: { mime: optimized.mime, ext: optimized.ext },
      size: optimized.output.length,
      fileName,
      absolutePath: saved.absolutePath,
    };
  } catch (error) {
    return fail(
      error instanceof StorageError
        ? "Failed to store document image"
        : "Could not process the document image",
      error instanceof StorageError ? "SELLER_KYC_STORE_FAILED" : "SELLER_KYC_PROCESS_FAILED",
    );
  }
}
