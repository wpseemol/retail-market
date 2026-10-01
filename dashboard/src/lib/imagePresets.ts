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

/** e.g. "1200 × 1200 px (1:1)" */
export function recommendedSize(preset: ImagePresetKey): string {
  const p = IMAGE_PRESETS[preset];
  if (p.ratio === "any") return `up to ${p.width} × ${p.height} px`;
  return `${p.width} × ${p.height} px (${p.ratio})`;
}

/**
 * Standard upload helper text:
 * "Recommended 1200 × 1200 px (1:1) · JPEG, PNG, WebP, or GIF · max 5 MB · always resized & optimized to WebP on the server"
 */
export function imageUploadHint(
  preset: ImagePresetKey,
  maxMb: number,
  opts: { prefix?: string; each?: boolean } = {},
): string {
  const p: ImagePreset = IMAGE_PRESETS[preset];
  const parts = [
    opts.prefix,
    `Recommended ${recommendedSize(preset)}${p.transparent ? ", transparent PNG/WebP works best" : ""}`,
    "JPEG, PNG, WebP, or GIF",
    `max ${maxMb} MB${opts.each ? " each" : ""}`,
    `always resized & optimized to ${p.format ?? "WebP"} on the server`,
  ];
  return parts.filter(Boolean).join(" · ");
}
