import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  AVATAR_ALLOWED_MIMES,
  detectAvatarImageType,
  type AvatarMime,
  type FinalizedAvatarResult,
} from "./avatarImage.js";
import { optimizeImageWithin } from "./imageOptimize.js";

/** Disk folder for customer review photos. */
export const REVIEW_IMAGES_DIR = path.resolve(process.cwd(), "uploads", "reviews");

/** Relative path stored on `medias.file_path`. */
export const REVIEW_IMAGES_RELATIVE = "reviews";

/** Per photo, before and after resize. */
export const REVIEW_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const REVIEW_IMAGE_MAX_FILES = 4;
const REVIEW_IMAGE_MIN_BYTES = 32;

fs.mkdirSync(REVIEW_IMAGES_DIR, { recursive: true });

function removeQuietly(file: string) {
  try {
    fs.unlinkSync(file);
  } catch {
    /* ignore */
  }
}

/** Sniff magic bytes, always resize/re-encode to WebP, store under uploads/reviews/. */
export async function finalizeReviewImageUpload(
  tempPath: string,
  declaredMime?: string | null,
): Promise<FinalizedAvatarResult> {
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(tempPath);
  } catch {
    return { ok: false, message: "Failed to read uploaded image", code: "REVIEW_IMAGE_READ_FAILED" };
  }

  const fail = (message: string, code: string): FinalizedAvatarResult => {
    removeQuietly(tempPath);
    return { ok: false, message, code };
  };

  if (buffer.length < REVIEW_IMAGE_MIN_BYTES) {
    return fail("Image file is empty or too small", "REVIEW_IMAGE_TOO_SMALL");
  }
  if (buffer.length > REVIEW_IMAGE_MAX_BYTES) {
    return fail("Each review photo must be 2 MB or smaller", "REVIEW_IMAGE_TOO_LARGE");
  }

  const detected = detectAvatarImageType(buffer);
  if (!detected) {
    return fail("Only JPEG, PNG, WebP, or GIF images are allowed", "REVIEW_IMAGE_INVALID_TYPE");
  }
  if (declaredMime && AVATAR_ALLOWED_MIMES.includes(declaredMime as AvatarMime) && declaredMime !== detected.mime) {
    return fail("File content does not match the declared image type", "REVIEW_IMAGE_MIME_MISMATCH");
  }

  try {
    const optimized = await optimizeImageWithin(buffer, "review", REVIEW_IMAGE_MAX_BYTES);
    if (!optimized) {
      return fail("Each review photo must be 2 MB or smaller after resize", "REVIEW_IMAGE_TOO_LARGE");
    }
    const fileName = `${randomUUID()}${optimized.ext}`;
    const absolutePath = path.join(REVIEW_IMAGES_DIR, fileName);
    fs.writeFileSync(absolutePath, optimized.output);
    removeQuietly(tempPath);
    return {
      ok: true,
      detected: { mime: optimized.mime, ext: optimized.ext },
      size: optimized.output.length,
      fileName,
      absolutePath,
    };
  } catch {
    return fail("Failed to process review photo", "REVIEW_IMAGE_PROCESS_FAILED");
  }
}
