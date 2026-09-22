import fs from "node:fs";
import path from "node:path";
import {
  finalizeAvatarUpload,
  sanitizeOriginalName,
  type FinalizedAvatarResult,
} from "./avatarImage.js";

/** Disk folder for shop logos / store images. */
export const SHOP_IMAGES_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "shops",
);

/** Relative path stored on `medias.file_path`. */
export const SHOP_IMAGES_RELATIVE = "shops";

fs.mkdirSync(SHOP_IMAGES_DIR, { recursive: true });

export function finalizeShopImageUpload(
  tempPath: string,
  declaredMime?: string | null,
): FinalizedAvatarResult {
  const result = finalizeAvatarUpload(tempPath, declaredMime);
  if (!result.ok) return result;

  const targetPath = path.join(SHOP_IMAGES_DIR, result.fileName);
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
          message: "Failed to store shop image",
          code: "AVATAR_STORE_FAILED",
        };
      }
    }
  }

  return {
    ...result,
    absolutePath: targetPath,
  };
}

export { sanitizeOriginalName };
