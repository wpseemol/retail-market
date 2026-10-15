/**
 * Recommended upload sizes, mirroring `backend/src/lib/imageOptimize.ts`.
 * The server shrinks anything larger to fit this box and re-encodes it as WebP
 * (favicon: PNG), so uploading at this size keeps the storefront fast without
 * losing sharpness.
 */
type ImagePreset = {
  width: number;
  height: number;
  ratio: string;
  format?: "PNG";
  transparent?: boolean;
};

export const IMAGE_PRESETS = {
  product: { width: 1200, height: 1200, ratio: "1:1" },
  category: { width: 400, height: 400, ratio: "1:1" },
  brand: { width: 600, height: 300, ratio: "2:1" },
  shopLogo: { width: 512, height: 512, ratio: "1:1" },
  shopBanner: { width: 1920, height: 640, ratio: "3:1" },
  brandBanner: { width: 1920, height: 640, ratio: "3:1" },
  avatar: { width: 400, height: 400, ratio: "1:1" },
  loginLogo: { width: 480, height: 120, ratio: "4:1" },
  favicon: { width: 512, height: 512, ratio: "1:1", format: "PNG" },
  ogImage: { width: 1200, height: 630, ratio: "1.91:1" },
  heroMainBg: { width: 1600, height: 700, ratio: "16:7" },
  heroMainProduct: { width: 880, height: 700, ratio: "5:4", transparent: true },
  heroSideBg: { width: 800, height: 700, ratio: "8:7" },
  heroSideProduct: { width: 440, height: 480, ratio: "11:12", transparent: true },
  homeIcon: { width: 128, height: 128, ratio: "1:1", transparent: true },
  homeDealCard: { width: 300, height: 260, ratio: "15:13", transparent: true },
  homePromoBg: { width: 1920, height: 500, ratio: "~4:1" },
  homePromoSlide: { width: 760, height: 540, ratio: "~7:5", transparent: true },
  homeRepairBg: { width: 1920, height: 520, ratio: "~4:1" },
  homeRepairProduct: { width: 960, height: 620, ratio: "~3:2", transparent: true },
  homeBrandLogo: { width: 240, height: 80, ratio: "3:1", transparent: true },
  homeModalProduct: { width: 500, height: 460, ratio: "25:23", transparent: true },
  homeModalBg: { width: 800, height: 720, ratio: "10:9" },
  homePromoImage: { width: 500, height: 460, ratio: "25:23" },
  homeDealsLeftImage: { width: 520, height: 480, ratio: "13:12" },
  homeDealsLeftBg: { width: 720, height: 920, ratio: "~4:5" },
  homeGeneric: { width: 1600, height: 1600, ratio: "any" },
} as const satisfies Record<string, ImagePreset>;

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

export function homeBlockImagePreset(
  blockKey: string,
  fieldPath: string,
): ImagePresetKey {
  const leaf = fieldPath.split(".").pop() ?? fieldPath;
  return HOME_BLOCK_PRESETS[`${blockKey}.${leaf}`] ?? "homeGeneric";
}

/** Presets with no size rule. Avatars are shared with storefront customers. */
const FREE_FORM_PRESETS: ReadonlySet<ImagePresetKey> = new Set(["avatar", "homeGeneric"]);

/** Allowed aspect-ratio difference; must match `IMAGE_RATIO_TOLERANCE` in the API. */
export const IMAGE_RATIO_TOLERANCE = 0.03;

export function isFreeFormPreset(preset: ImagePresetKey): boolean {
  return FREE_FORM_PRESETS.has(preset);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Reduced ratio for the user's own image, e.g. 1600×900 → "16:9", 1200×630 → "1.9:1". */
export function formatRatio(width: number, height: number): string {
  const d = gcd(width, height);
  const w = width / d;
  const h = height / d;
  if (w <= 32 && h <= 32) return `${w}:${h}`;
  return width >= height
    ? `${(width / height).toFixed(2).replace(/\.?0+$/, "")}:1`
    : `1:${(height / width).toFixed(2).replace(/\.?0+$/, "")}`;
}

/** Exact shape the upload must have; "~" presets are shown as their real ratio. */
export function presetShape(preset: ImagePresetKey): string {
  const p: ImagePreset = IMAGE_PRESETS[preset];
  return p.ratio.startsWith("~") ? formatRatio(p.width, p.height) : p.ratio;
}

/** e.g. "1200 × 1200 px (1:1)" */
export function recommendedSize(preset: ImagePresetKey): string {
  const p = IMAGE_PRESETS[preset];
  if (p.ratio === "any") return `up to ${p.width} × ${p.height} px`;
  return `${p.width} × ${p.height} px (${presetShape(preset)})`;
}

/** Short label for field headers, e.g. "1200 × 1200 px · 1:1" or "Any size". */
export function imageSizeLabel(preset: ImagePresetKey): string {
  const p = IMAGE_PRESETS[preset];
  if (isFreeFormPreset(preset)) {
    return p.ratio === "any" ? "Any size" : `${p.width} × ${p.height} px · ${p.ratio}`;
  }
  return `${p.width} × ${p.height} px · ${presetShape(preset)}`;
}

/**
 * Standard upload helper text:
 * "At least 1200 × 1200 px (1:1) · JPEG, PNG, WebP, or GIF · max 5 MB · always resized & optimized to WebP on the server"
 */
export function imageUploadHint(
  preset: ImagePresetKey,
  maxMb: number,
  opts: { prefix?: string; each?: boolean } = {},
): string {
  const p: ImagePreset = IMAGE_PRESETS[preset];
  const size = isFreeFormPreset(preset)
    ? `Recommended ${recommendedSize(preset)}`
    : `At least ${p.width} × ${p.height} px, ${presetShape(preset)} shape`;
  const parts = [
    opts.prefix,
    `${size}${p.transparent ? ", transparent PNG/WebP works best" : ""}`,
    "JPEG, PNG, WebP, or GIF",
    `max ${maxMb} MB${opts.each ? " each" : ""}`,
    `always resized & optimized to ${p.format ?? "WebP"} on the server`,
  ];
  return parts.filter(Boolean).join(" · ");
}

export type ImageDimensionCheck =
  | { ok: true; width: number; height: number }
  | { ok: false; message: string; width?: number; height?: number };

async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Same rule as the API: the image must have the preset's shape (within 3%) and be at least
 * the preset size. Larger images are fine — the server shrinks them.
 */
export async function checkImageDimensions(
  file: File,
  preset: ImagePresetKey,
): Promise<ImageDimensionCheck> {
  let width: number;
  let height: number;
  try {
    ({ width, height } = await readImageSize(file));
  } catch {
    return { ok: false, message: "Could not read this image. Try a different JPEG, PNG, or WebP file." };
  }
  if (isFreeFormPreset(preset)) return { ok: true, width, height };

  const need = IMAGE_PRESETS[preset];
  const needRatio = need.width / need.height;
  const shape = presetShape(preset);
  const needLabel = `${need.width} × ${need.height} px (${shape})`;

  if (Math.abs(width / height - needRatio) / needRatio > IMAGE_RATIO_TOLERANCE) {
    return {
      ok: false,
      width,
      height,
      message: `Wrong shape: your image is ${width} × ${height} px (${formatRatio(width, height)}), this spot needs ${shape} — e.g. ${needLabel}. Crop it to ${shape} and try again.`,
    };
  }
  if (width < need.width || height < need.height) {
    return {
      ok: false,
      width,
      height,
      message: `Too small: your image is ${width} × ${height} px, it must be at least ${needLabel} so it stays sharp.`,
    };
  }
  return { ok: true, width, height };
}
