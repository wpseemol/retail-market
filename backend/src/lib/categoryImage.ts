import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  detectAvatarImageType,
  sanitizeOriginalName,
  type AvatarMime,
  type FinalizedAvatarOk,
  type FinalizedAvatarResult,
} from "./avatarImage.js";
import { PRODUCT_IMAGES_DIR, PRODUCT_IMAGES_RELATIVE } from "./productImage.js";

/** Category cover images — max 1 MB before/after processing. */
export const CATEGORY_IMAGE_MAX_BYTES = 1 * 1024 * 1024;
export const CATEGORY_IMAGE_MIN_BYTES = 32;
export const CATEGORY_IMAGE_MAX_EDGE = 1200;
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
 * Validate (≤1 MB), resize to max edge, re-encode as JPEG/WebP/PNG, store under uploads/products/.
 * Animated GIFs are converted to a still WebP frame for safety/size.
 */
export async function finalizeCategoryImageUpload(
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
    const pipeline = sharp(buffer, { failOn: "error", animated: false }).rotate();
    const meta = await pipeline.metadata();
    const width = meta.width ?? CATEGORY_IMAGE_MAX_EDGE;
    const height = meta.height ?? CATEGORY_IMAGE_MAX_EDGE;
    const needsResize =
      width > CATEGORY_IMAGE_MAX_EDGE || height > CATEGORY_IMAGE_MAX_EDGE;

    let output: Buffer;
    let mime: AvatarMime;
    let ext: ".jpg" | ".png" | ".webp";

    // Prefer WebP for size; keep PNG if source had alpha and is PNG.
    const hasAlpha = Boolean(meta.hasAlpha);
    if (validated.detected.mime === "image/png" && hasAlpha) {
      let img = pipeline;
      if (needsResize) {
        img = img.resize({
          width: CATEGORY_IMAGE_MAX_EDGE,
          height: CATEGORY_IMAGE_MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        });
      }
      output = await img.png({ compressionLevel: 8 }).toBuffer();
      mime = "image/png";
      ext = ".png";
    } else if (validated.detected.mime === "image/webp" || validated.detected.mime === "image/gif") {
      let img = pipeline;
      if (needsResize) {
        img = img.resize({
          width: CATEGORY_IMAGE_MAX_EDGE,
          height: CATEGORY_IMAGE_MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        });
      }
      output = await img.webp({ quality: 82 }).toBuffer();
      mime = "image/webp";
      ext = ".webp";
    } else {
      let img = pipeline;
      if (needsResize) {
        img = img.resize({
          width: CATEGORY_IMAGE_MAX_EDGE,
          height: CATEGORY_IMAGE_MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        });
      }
      output = await img.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
      mime = "image/jpeg";
      ext = ".jpg";
    }

    if (output.length > CATEGORY_IMAGE_MAX_BYTES) {
      // Second pass: stronger compression as JPEG.
      output = await sharp(output)
        .resize({
          width: 1000,
          height: 1000,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer();
      mime = "image/jpeg";
      ext = ".jpg";
    }

    if (output.length > CATEGORY_IMAGE_MAX_BYTES) {
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
