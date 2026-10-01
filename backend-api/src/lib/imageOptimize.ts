import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type {
  AvatarMime,
  FinalizedAvatarOk,
  FinalizedAvatarResult,
} from "./avatarImage.js";

/**
 * Upload presets, sized to ~2× the largest place each image is shown on the storefront.
 * The stored image always fits inside `width`×`height` (never upscaled, never cropped).
 * Keep in sync with `dashboard/src/lib/imagePresets.ts`, which shows these as the
 * recommended upload size.
 */
export const IMAGE_PRESETS = {
  product: { width: 1200, height: 1200, format: "webp" },
  review: { width: 1200, height: 1200, format: "webp" },
  category: { width: 400, height: 400, format: "webp" },
  brand: { width: 600, height: 300, format: "webp" },
  shopLogo: { width: 512, height: 512, format: "webp" },
  shopBanner: { width: 1920, height: 640, format: "webp" },
  avatar: { width: 400, height: 400, format: "webp" },
  loginLogo: { width: 480, height: 120, format: "webp" },
  favicon: { width: 512, height: 512, format: "png" },
  ogImage: { width: 1200, height: 630, format: "webp" },
  heroMainBg: { width: 1600, height: 700, format: "webp" },
  heroMainProduct: { width: 880, height: 700, format: "webp" },
  heroSideBg: { width: 800, height: 700, format: "webp" },
  heroSideProduct: { width: 440, height: 480, format: "webp" },
  homeIcon: { width: 128, height: 128, format: "webp" },
  homeDealCard: { width: 300, height: 260, format: "webp" },
  homePromoBg: { width: 1920, height: 500, format: "webp" },
  homePromoSlide: { width: 760, height: 540, format: "webp" },
  homeRepairBg: { width: 1920, height: 520, format: "webp" },
  homeRepairProduct: { width: 960, height: 620, format: "webp" },
  homeBrandLogo: { width: 240, height: 80, format: "webp" },
  homeModalProduct: { width: 500, height: 460, format: "webp" },
  homeModalBg: { width: 800, height: 720, format: "webp" },
  homePromoImage: { width: 500, height: 460, format: "webp" },
  homeDealsLeftImage: { width: 520, height: 480, format: "webp" },
  homeDealsLeftBg: { width: 720, height: 920, format: "webp" },
  homeGeneric: { width: 1600, height: 1600, format: "webp" },
} as const satisfies Record<string, { width: number; height: number; format: "webp" | "png" }>;

export type ImagePresetKey = keyof typeof IMAGE_PRESETS;

const HOME_BLOCK_PRESETS: Record<string, ImagePresetKey> = {
  "welcome_modal.product_image": "homeModalProduct",
  "welcome_modal.bg_image": "homeModalBg",
  "featured.icon": "homeIcon",
  "deals_banner.image": "homeDealCard",
  "promo_slider.bg_image": "homePromoBg",
  "promo_slider.image": "homePromoSlide",
  "laptop_repair.bg_image": "homeRepairBg",
  "laptop_repair.product_image": "homeRepairProduct",
  "top_brands.image": "homeBrandLogo",
  "best_sellers.promo_image": "homePromoImage",
  "deals_of_day.left_image": "homeDealsLeftImage",
  "deals_of_day.left_bg": "homeDealsLeftBg",
};

/** Preset for a home-block upload, e.g. (`promo_slider`, `slides.2.image`) → `homePromoSlide`. */
export function homeBlockImagePreset(blockKey: string, fieldPath: string): ImagePresetKey {
  const leaf = fieldPath.split(".").pop() ?? fieldPath;
  return HOME_BLOCK_PRESETS[`${blockKey}.${leaf}`] ?? "homeGeneric";
}

export type OptimizedImage = {
  output: Buffer;
  mime: AvatarMime;
  ext: ".webp" | ".png";
};

/**
 * Resize into the preset box and re-encode. WebP keeps transparency, so PNG logos stay
 * transparent while shrinking a lot. Animated GIFs become a single still frame.
 */
export async function optimizeImage(
  buffer: Buffer,
  preset: ImagePresetKey,
  quality = 80,
): Promise<OptimizedImage> {
  const { width, height, format } = IMAGE_PRESETS[preset];
  const img = sharp(buffer, { failOn: "error", animated: false })
    .rotate()
    .resize({ width, height, fit: "inside", withoutEnlargement: true });

  if (format === "png") {
    return {
      output: await img.png({ compressionLevel: 9, palette: true }).toBuffer(),
      mime: "image/png",
      ext: ".png",
    };
  }
  return {
    output: await img.webp({ quality, alphaQuality: 90, effort: 5 }).toBuffer(),
    mime: "image/webp",
    ext: ".webp",
  };
}

/** Re-encodes at decreasing quality until the file fits `maxBytes` (or gives up). */
export async function optimizeImageWithin(
  buffer: Buffer,
  preset: ImagePresetKey,
  maxBytes: number,
): Promise<OptimizedImage | null> {
  for (const quality of [80, 68, 55]) {
    const result = await optimizeImage(buffer, preset, quality);
    if (result.output.length <= maxBytes) return result;
    if (result.mime === "image/png") return null;
  }
  return null;
}

/**
 * Optimizes an upload that was already validated and stored (magic bytes checked,
 * UUID file name). Replaces it with the resized file next to it and deletes the original.
 */
export async function optimizeStoredUpload(
  stored: FinalizedAvatarOk,
  preset: ImagePresetKey,
  maxBytes: number,
): Promise<FinalizedAvatarResult> {
  const remove = (file: string) => {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  };

  let optimized: OptimizedImage | null;
  try {
    optimized = await optimizeImageWithin(fs.readFileSync(stored.absolutePath), preset, maxBytes);
  } catch {
    remove(stored.absolutePath);
    return { ok: false, message: "Failed to process image", code: "IMAGE_PROCESS_FAILED" };
  }
  if (!optimized) {
    remove(stored.absolutePath);
    return {
      ok: false,
      message: `Image must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller after resize`,
      code: "IMAGE_TOO_LARGE",
    };
  }

  const fileName = `${randomUUID()}${optimized.ext}`;
  const absolutePath = path.join(path.dirname(stored.absolutePath), fileName);
  fs.writeFileSync(absolutePath, optimized.output);
  remove(stored.absolutePath);

  return {
    ok: true,
    detected: { mime: optimized.mime, ext: optimized.ext },
    size: optimized.output.length,
    fileName,
    absolutePath,
  };
}
