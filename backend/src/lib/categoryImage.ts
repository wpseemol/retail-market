import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  detectAvatarImageType,
  sanitizeOriginalName,
  type FinalizedAvatarOk,
  type FinalizedAvatarResult,
} from "./avatarImage.js";
import { optimizeImageWithin, type ImagePresetKey } from "./imageOptimize.js";
import { PRODUCT_IMAGES_DIR, PRODUCT_IMAGES_RELATIVE } from "./productImage.js";

/** Category cover images — max 1 MB before/after processing. */
export const CATEGORY_IMAGE_MAX_BYTES = 1 * 1024 * 1024;
export const CATEGORY_IMAGE_MIN_BYTES = 32;
export const CATEGORY_IMAGE_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type CategoryImageMime = (typeof CATEGORY_IMAGE_ALLOWED_MIMES)[number];

fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });

export { PRODUCT_IMAGES_RELATIVE, sanitizeOriginalName };

function validateCategoryBuffer(
  buffer: Buffer,
  declaredMime?: string | null,
): FinalizedAvatarResult | { ok: true; detected: NonNullable<ReturnType<typeof detectAvatarImageType>>; size: number } {
  const size = buffer.length;

  if (size < CATEGORY_IMAGE_MIN_BYTES) {
    return {
      ok: false,
      message: "Image file is empty or too small",
      code: "CATEGORY_IMAGE_TOO_SMALL",
    };
  }

  if (size > CATEGORY_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      message: "Category image must be 1 MB or smaller",
      code: "CATEGORY_IMAGE_TOO_LARGE",
    };
  }

  const detected = detectAvatarImageType(buffer);
  if (!detected) {
    return {
      ok: false,
      message: "Only JPEG, PNG, WebP, or GIF images are allowed",
      code: "CATEGORY_IMAGE_INVALID_TYPE",
    };
  }

  if (
    declaredMime &&
    declaredMime.length > 0 &&
    CATEGORY_IMAGE_ALLOWED_MIMES.includes(declaredMime as CategoryImageMime) &&
    declaredMime !== detected.mime
  ) {
    return {
      ok: false,
      message: "File content does not match the declared image type",
      code: "CATEGORY_IMAGE_MIME_MISMATCH",
    };
  }

  if (
    declaredMime &&
    declaredMime.length > 0 &&
    !CATEGORY_IMAGE_ALLOWED_MIMES.includes(declaredMime as CategoryImageMime)
  ) {
    return {
      ok: false,
      message: "Only JPEG, PNG, WebP, or GIF images are allowed",
      code: "CATEGORY_IMAGE_INVALID_TYPE",
    };
  }

  return { ok: true, detected, size };
}

/**
 * Validate (≤1 MB), resize into the preset box, re-encode (WebP), store under uploads/products/.
 * Shared by categories, brands, site identity, home hero and home blocks.
 */
export async function finalizeCategoryImageUpload(
  tempPath: string,
  declaredMime?: string | null,
  preset: ImagePresetKey = "category",
): Promise<FinalizedAvatarResult> {
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(tempPath);
  } catch {
    return {
      ok: false,
      message: "Failed to read uploaded image",
      code: "CATEGORY_IMAGE_READ_FAILED",
    };
  }

  const validated = validateCategoryBuffer(buffer, declaredMime);
  if (!validated.ok) {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
    return validated;
  }

  try {
    const optimized = await optimizeImageWithin(buffer, preset, CATEGORY_IMAGE_MAX_BYTES);
    if (!optimized) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        message: "Category image must be 1 MB or smaller after resize",
        code: "CATEGORY_IMAGE_TOO_LARGE",
      };
    }
    const { output, mime, ext } = optimized;

    const fileName = `${randomUUID()}${ext}`;
    const absolutePath = path.join(PRODUCT_IMAGES_DIR, fileName);
    fs.writeFileSync(absolutePath, output);
    try {
      fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }

    return {
      ok: true,
      detected: { mime, ext },
      size: output.length,
      fileName,
      absolutePath,
    } satisfies FinalizedAvatarOk;
  } catch {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      message: "Failed to process category image",
      code: "CATEGORY_IMAGE_PROCESS_FAILED",
    };
  }
}
