import fs from "node:fs";
import path from "node:path";
import {
  finalizeAvatarUpload,
  sanitizeOriginalName,
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

fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });

/**
 * Finalize a multer temp upload into `uploads/products/<uuid>.<ext>`.
 * Reuses the same magic-byte checks as avatars.
 */
export function finalizeProductImageUpload(
  tempPath: string,
  declaredMime?: string | null,
): FinalizedAvatarResult {
  const result = finalizeAvatarUpload(tempPath, declaredMime);
  if (!result.ok) return result;

  // Avatar finalize keeps the file in the temp dir; move into products/.
  const targetPath = path.join(PRODUCT_IMAGES_DIR, result.fileName);
  if (result.absolutePath !== targetPath) {
    try {
      fs.renameSync(result.absolutePath, targetPath);
    } catch {
      try {
        fs.copyFileSync(result.absolutePath, targetPath);
        fs.unlinkSync(result.absolutePath);
      } catch {
        try {
          fs.unlinkSync(result.absolutePath);
        } catch {
          /* ignore */
        }
        return {
          ok: false,
          message: "Failed to store product image",
          code: "AVATAR_STORE_FAILED",
        };
      }
    }
  }

  return {
    ...result,
    absolutePath: targetPath,
  } satisfies FinalizedAvatarOk;
}

export { sanitizeOriginalName };
