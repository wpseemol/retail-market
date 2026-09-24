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
export const PRODUCT_IMAGE_MAX_EDGE = 1600;
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
    const pipeline = sharp(buffer, {
      failOn: "error",
      animated: false,
    }).rotate();
    const meta = await pipeline.metadata();
    const width = meta.width ?? PRODUCT_IMAGE_MAX_EDGE;
    const height = meta.height ?? PRODUCT_IMAGE_MAX_EDGE;
    const needsResize =
      width > PRODUCT_IMAGE_MAX_EDGE || height > PRODUCT_IMAGE_MAX_EDGE;

    let output: Buffer;
    let mime: AvatarMime;
    let ext: ".jpg" | ".png" | ".webp";

    const hasAlpha = Boolean(meta.hasAlpha);
    if (validated.detected.mime === "image/png" && hasAlpha) {
      let img = pipeline;
      if (needsResize) {
        img = img.resize({
          width: PRODUCT_IMAGE_MAX_EDGE,
          height: PRODUCT_IMAGE_MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        });
      }
      output = await img.png({ compressionLevel: 8 }).toBuffer();
      mime = "image/png";
      ext = ".png";
    } else if (
      validated.detected.mime === "image/webp" ||
      validated.detected.mime === "image/gif"
    ) {
      let img = pipeline;
      if (needsResize) {
        img = img.resize({
          width: PRODUCT_IMAGE_MAX_EDGE,
          height: PRODUCT_IMAGE_MAX_EDGE,
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
          width: PRODUCT_IMAGE_MAX_EDGE,
          height: PRODUCT_IMAGE_MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        });
      }
      output = await img.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
      mime = "image/jpeg";
      ext = ".jpg";
    }

    // Always re-encode at least once so every upload is processed.
    if (
      output.length === buffer.length &&
      !needsResize &&
      validated.detected.mime === "image/jpeg"
    ) {
      output = await sharp(buffer)
        .rotate()
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      mime = "image/jpeg";
      ext = ".jpg";
    }

    if (output.length > PRODUCT_IMAGE_MAX_BYTES) {
      output = await sharp(output)
        .resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer();
      mime = "image/jpeg";
      ext = ".jpg";
    }

    if (output.length > PRODUCT_IMAGE_MAX_BYTES) {
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
