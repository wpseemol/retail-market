import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  detectAvatarImageType,
  sanitizeOriginalName,
  type FinalizedAvatarOk,
  type FinalizedAvatarResult,
} from "./avatarImage.js";
import { IMAGE_PRESETS, optimizeImageWithin } from "./imageOptimize.js";

/** Disk folder for all product / variant / category catalog images. */
export const PRODUCT_IMAGES_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "products",
);

/** Relative path stored on `medias.file_path`. */
export const PRODUCT_IMAGES_RELATIVE = "products";

/** Product gallery / thumbnail — max 5 MB before/after processing. */
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MIN_BYTES = 32;
export const PRODUCT_IMAGE_MAX_EDGE = IMAGE_PRESETS.product.width;
export const PRODUCT_IMAGE_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ProductImageMime = (typeof PRODUCT_IMAGE_ALLOWED_MIMES)[number];

fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });

export { sanitizeOriginalName };

function validateProductBuffer(
  buffer: Buffer,
  declaredMime?: string | null,
):
  | FinalizedAvatarResult
  | {
      ok: true;
      detected: NonNullable<ReturnType<typeof detectAvatarImageType>>;
      size: number;
    } {
  const size = buffer.length;

  if (size < PRODUCT_IMAGE_MIN_BYTES) {
    return {
      ok: false,
      message: "Image file is empty or too small",
      code: "PRODUCT_IMAGE_TOO_SMALL",
    };
  }

  if (size > PRODUCT_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      message: "Product image must be 5 MB or smaller",
      code: "PRODUCT_IMAGE_TOO_LARGE",
    };
  }

  const detected = detectAvatarImageType(buffer);
  if (!detected) {
    return {
      ok: false,
      message: "Only JPEG, PNG, WebP, or GIF images are allowed",
      code: "PRODUCT_IMAGE_INVALID_TYPE",
    };
  }

  if (
    declaredMime &&
    declaredMime.length > 0 &&
    PRODUCT_IMAGE_ALLOWED_MIMES.includes(declaredMime as ProductImageMime) &&
    declaredMime !== detected.mime
  ) {
    return {
      ok: false,
      message: "File content does not match the declared image type",
      code: "PRODUCT_IMAGE_MIME_MISMATCH",
    };
  }

  if (
    declaredMime &&
    declaredMime.length > 0 &&
    !PRODUCT_IMAGE_ALLOWED_MIMES.includes(declaredMime as ProductImageMime)
  ) {
    return {
      ok: false,
      message: "Only JPEG, PNG, WebP, or GIF images are allowed",
      code: "PRODUCT_IMAGE_INVALID_TYPE",
    };
  }

  return { ok: true, detected, size };
}

/**
 * Validate (≤5 MB), always resize/re-encode, store under uploads/products/.
 */
export async function finalizeProductImageUpload(
  tempPath: string,
  declaredMime?: string | null,
): Promise<FinalizedAvatarResult> {
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(tempPath);
  } catch {
    return {
      ok: false,
      message: "Failed to read uploaded image",
      code: "PRODUCT_IMAGE_READ_FAILED",
    };
  }

  const validated = validateProductBuffer(buffer, declaredMime);
  if (!validated.ok) {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
    return validated;
  }

  try {
    const optimized = await optimizeImageWithin(buffer, "product", PRODUCT_IMAGE_MAX_BYTES);
    if (!optimized) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        message: "Product image must be 5 MB or smaller after resize",
        code: "PRODUCT_IMAGE_TOO_LARGE",
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
      message: "Failed to process product image",
      code: "PRODUCT_IMAGE_PROCESS_FAILED",
    };
  }
}
