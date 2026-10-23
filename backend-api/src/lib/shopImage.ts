import path from "node:path";
import {
  AVATAR_MAX_BYTES,
  finalizeAvatarUpload,
  sanitizeOriginalName,
  type FinalizedAvatarResult,
} from "./avatarImage.js";
import { optimizeStoredUpload, type ImagePresetKey } from "./imageOptimize.js";
import { ensureLocalUploadDir } from "./storage/files.js";

/** Disk folder for shop logos / store images. */
export const SHOP_IMAGES_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "shops",
);

/** Relative path stored on `medias.file_path`. */
export const SHOP_IMAGES_RELATIVE = "shops";

ensureLocalUploadDir(SHOP_IMAGES_DIR);

/** Validates, resizes into the `shopLogo` / `shopBanner` box, and stores the result. */
export async function finalizeShopImageUpload(
  source: Buffer | string,
  declaredMime: string | null | undefined,
  preset: Extract<ImagePresetKey, "shopLogo" | "shopBanner" | "brandBanner">,
): Promise<FinalizedAvatarResult> {
  const validated = finalizeAvatarUpload(source, declaredMime);
  if (!validated.ok) return validated;
  return optimizeStoredUpload(validated, preset, AVATAR_MAX_BYTES, {
    absoluteDir: SHOP_IMAGES_DIR,
    relativeDir: SHOP_IMAGES_RELATIVE,
  });
}

export { sanitizeOriginalName };
