import fs from "node:fs";
import path from "node:path";
import {
  AVATAR_MAX_BYTES,
  finalizeAvatarUpload,
  sanitizeOriginalName,
  type FinalizedAvatarResult,
} from "./avatarImage.js";
import { optimizeStoredUpload, type ImagePresetKey } from "./imageOptimize.js";

/** Disk folder for shop logos / store images. */
export const SHOP_IMAGES_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "shops",
);

/** Relative path stored on `medias.file_path`. */
export const SHOP_IMAGES_RELATIVE = "shops";

fs.mkdirSync(SHOP_IMAGES_DIR, { recursive: true });

/** Validates, resizes into the `shopLogo` / `shopBanner` box, and stores under uploads/shops/. */
export async function finalizeShopImageUpload(
  tempPath: string,
  declaredMime: string | null | undefined,
  preset: Extract<ImagePresetKey, "shopLogo" | "shopBanner">,
): Promise<FinalizedAvatarResult> {
  const validated = finalizeAvatarUpload(tempPath, declaredMime);
  if (!validated.ok) return validated;
  const result = await optimizeStoredUpload(validated, preset, AVATAR_MAX_BYTES);
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
