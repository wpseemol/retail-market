import fs from "node:fs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type {
  AvatarMime,
  FinalizedAvatarOk,
  FinalizedAvatarResult,
} from "./avatarImage.js";
import { saveMediaFile, StorageError } from "./storage/files.js";

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
  brandBanner: { width: 1920, height: 640, format: "webp" },
  avatar: { width: 400, height: 400, format: "webp" },
  loginLogo: { width: 480, height: 120, format: "webp" },
  loginPanel: { width: 960, height: 1200, format: "webp" },
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

/**
 * Uploads with no dimension rule: customer photos (reviews, avatars — the avatar
 * endpoint is shared with storefront customers) and free-form home images.
 */
const FREE_FORM_PRESETS: ReadonlySet<ImagePresetKey> = new Set(["review", "avatar", "homeGeneric"]);

/** Allowed difference between the upload's aspect ratio and the preset's. Mirrors the dashboard. */
export const IMAGE_RATIO_TOLERANCE = 0.03;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** e.g. 1200×630 → "40:21" is unreadable, so large terms fall back to "1.9:1". */
export function formatRatio(width: number, height: number): string {
  const d = gcd(width, height);
  const w = width / d;
  const h = height / d;
  if (w <= 32 && h <= 32) return `${w}:${h}`;
  return width >= height
    ? `${(width / height).toFixed(2).replace(/\.?0+$/, "")}:1`
    : `1:${(height / width).toFixed(2).replace(/\.?0+$/, "")}`;
}

export type ImageDimensionResult =
  | { ok: true; width: number; height: number }
  | {
      ok: false;
      message: string;
      code: "IMAGE_TOO_SMALL" | "IMAGE_WRONG_RATIO" | "IMAGE_PROCESS_FAILED";
    };

/**
 * Dashboard uploads must have the preset's shape (within 3%) and be at least the preset
 * size, so they are never stretched or upscaled on the storefront. Larger is fine.
 */
export async function checkImageDimensions(
  buffer: Buffer,
  preset: ImagePresetKey,
): Promise<ImageDimensionResult> {
  let width: number;
  let height: number;
  try {
    const meta = await sharp(buffer, { animated: false }).metadata();
    if (!meta.width || !meta.height) throw new Error("no size");
    const rotated = (meta.orientation ?? 1) >= 5;
    width = rotated ? meta.height : meta.width;
    height = rotated ? meta.width : meta.height;
  } catch {
    return { ok: false, message: "Could not read the image size", code: "IMAGE_PROCESS_FAILED" };
  }

  if (FREE_FORM_PRESETS.has(preset)) return { ok: true, width, height };

  const need = IMAGE_PRESETS[preset];
  const needRatio = need.width / need.height;
  const needLabel = `${need.width} × ${need.height} px (${formatRatio(need.width, need.height)})`;
  const gotLabel = `${width} × ${height} px`;

  if (Math.abs(width / height - needRatio) / needRatio > IMAGE_RATIO_TOLERANCE) {
    return {
      ok: false,
      code: "IMAGE_WRONG_RATIO",
      message: `Image is ${gotLabel} (${formatRatio(width, height)}) but this spot needs a ${formatRatio(need.width, need.height)} shape — e.g. ${needLabel}. Crop it to ${formatRatio(need.width, need.height)} and upload again.`,
    };
  }
  if (width < need.width || height < need.height) {
    return {
      ok: false,
      code: "IMAGE_TOO_SMALL",
      message: `Image is ${gotLabel} — too small. It must be at least ${needLabel} so it stays sharp.`,
    };
  }
  return { ok: true, width, height };
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

function removeLocal(file: string) {
  if (!file || file.startsWith("s3://")) return;
  try {
    fs.unlinkSync(file);
  } catch {
    /* ignore */
  }
}

/**
 * Resizes bytes that were already sniffed, then stores the WebP/PNG result.
 * S3 mode streams that buffer and does not write `uploads/`.
 */
export async function optimizeStoredUpload(
  stored: FinalizedAvatarOk,
  preset: ImagePresetKey,
  maxBytes: number,
  destination: { absoluteDir: string; relativeDir: string },
): Promise<FinalizedAvatarResult> {
  let optimized: OptimizedImage | null;
  try {
    const buffer = stored.body ?? (stored.absolutePath ? fs.readFileSync(stored.absolutePath) : null);
    if (!buffer) {
      return { ok: false, message: "Failed to process image", code: "IMAGE_PROCESS_FAILED" };
    }
    const dims = await checkImageDimensions(buffer, preset);
    if (!dims.ok) {
      removeLocal(stored.absolutePath);
      return dims;
    }
    optimized = await optimizeImageWithin(buffer, preset, maxBytes);
  } catch {
    removeLocal(stored.absolutePath);
    return { ok: false, message: "Failed to process image", code: "IMAGE_PROCESS_FAILED" };
  }
  if (!optimized) {
    removeLocal(stored.absolutePath);
    return {
      ok: false,
      message: `Image must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller after resize`,
      code: "IMAGE_TOO_LARGE",
    };
  }

  const fileName = `${randomUUID()}${optimized.ext}`;
  try {
    const saved = await saveMediaFile({
      absoluteDir: destination.absoluteDir,
      relativeDir: destination.relativeDir,
      fileName,
      body: optimized.output,
      contentType: optimized.mime,
    });
    removeLocal(stored.absolutePath);
    return {
      ok: true,
      detected: { mime: optimized.mime, ext: optimized.ext },
      size: optimized.output.length,
      fileName,
      absolutePath: saved.absolutePath,
    };
  } catch (error) {
    removeLocal(stored.absolutePath);
    if (error instanceof StorageError) {
      return { ok: false, message: "Failed to store image", code: "IMAGE_STORE_FAILED" };
    }
    return { ok: false, message: "Failed to process image", code: "IMAGE_PROCESS_FAILED" };
  }
}
