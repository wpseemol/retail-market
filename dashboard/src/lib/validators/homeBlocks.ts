import { z } from "zod";
import { validateSafeImageFile, withSafeInput } from "./safeInput";

export const HOME_BLOCK_IMAGE_MAX_BYTES = 1 * 1024 * 1024;

export function validateHomeBlockImageFile(file: File | null | undefined) {
  return validateSafeImageFile(file, HOME_BLOCK_IMAGE_MAX_BYTES, "Home image");
}

const safe = (min: number, max: number, label: string) =>
  withSafeInput(
    z
      .string()
      .trim()
      .min(min, `${label} is required`)
      .max(max, `${label} is too long`),
  );

const safeOpt = (max: number) =>
  withSafeInput(z.string().trim().max(max));

const percent = z.number().int().min(0).max(100);
const path = safe(1, 500, "Image path");

export const featuredItemSchema = z.object({
  title: safe(1, 80, "Title"),
  description: safe(1, 160, "Description"),
  icon: path,
  alt: safe(1, 120, "Alt text"),
});

export const featuredFormSchema = z.object({
  items: z.array(featuredItemSchema).min(1).max(8),
});

export const dealsCardSchema = z.object({
  title_top: safe(1, 60, "Title line 1"),
  title_bottom: safe(1, 60, "Title line 2"),
  discount_percent: percent,
  image: path,
  alt: safe(1, 120, "Alt text"),
  href: safe(1, 300, "Link"),
  cta_label: safe(1, 40, "CTA label"),
});

export const dealsBannerFormSchema = z.object({
  cards: z.array(dealsCardSchema).min(1).max(8),
});

export const laptopRepairFormSchema = z.object({
  badge_label: safe(1, 40, "Badge"),
  headline_line1: safe(1, 80, "Headline line 1"),
  headline_line2: safe(1, 80, "Headline line 2"),
  subtext: safeOpt(200),
  offer_percent: percent,
  offer_label: safe(1, 40, "Offer label"),
  cta_label: safe(1, 40, "CTA label"),
  cta_href: safe(1, 300, "CTA link"),
  bg_image: path,
  product_image: path,
});

export const topBrandItemSchema = z.object({
  name: safe(1, 60, "Brand name"),
  href: safe(1, 300, "Link"),
  image: z
    .union([path, z.literal(""), z.null()])
    .transform((v) => (v === "" ? null : v)),
});

export const topBrandsFormSchema = z.object({
  title: safe(1, 80, "Section title"),
  see_all_label: safe(1, 40, "See-all label"),
  see_all_href: safe(1, 300, "See-all link"),
  brands: z.array(topBrandItemSchema).min(1).max(16),
});

export const promoSlideSchema = z.object({
  price: safe(1, 40, "Price"),
  tagline: safe(1, 60, "Tagline"),
  highlight_text: safe(1, 40, "Highlight"),
  sub_highlight: safe(1, 40, "Sub highlight"),
  category_tag: safe(1, 40, "Category tag"),
  title_line1: safe(1, 80, "Title line 1"),
  title_line2: safe(1, 80, "Title line 2"),
  cta_label: safe(1, 40, "CTA label"),
  cta_href: safe(1, 300, "CTA link"),
  image: path,
  image_alt: safe(1, 120, "Image alt"),
});

export const promoSliderFormSchema = z.object({
  bg_image: path,
  autoplay_ms: z.number().int().min(2000).max(20000),
  slides: z.array(promoSlideSchema).min(1).max(8),
});

export const bestSellersFormSchema = z.object({
  title: safe(1, 80, "Section title"),
  promo_badge: safe(1, 40, "Promo badge"),
  promo_headline: safe(1, 120, "Promo headline"),
  promo_discount_percent: percent,
  promo_cta_label: safe(1, 40, "Promo CTA"),
  promo_cta_href: safe(1, 300, "Promo link"),
  promo_image: path,
  product_sort: z.enum(["newest", "default", "price-asc", "price-desc", "name-asc"]),
  product_limit: z.number().int().min(4).max(24),
});

export const latestProductsFormSchema = z.object({
  title: safe(1, 80, "Grid title"),
  sidebar_title: safe(1, 80, "Sidebar title"),
  product_sort: z.enum(["newest", "default", "price-asc", "price-desc", "name-asc"]),
  product_limit: z.number().int().min(4).max(24),
  sidebar_limit: z.number().int().min(2).max(12),
});

export const dealsOfDayFormSchema = z.object({
  title: safe(1, 80, "Section title"),
  left_badge: safe(1, 40, "Left badge"),
  left_headline: safe(1, 120, "Left headline"),
  left_cta_label: safe(1, 40, "Left CTA"),
  left_cta_href: safe(1, 300, "Left link"),
  left_image: path,
  left_bg: path,
  product_sort: z.enum(["newest", "default", "price-asc", "price-desc", "name-asc"]),
  product_limit: z.number().int().min(2).max(12),
});

export const productGroupsFormSchema = z.object({
  title: safe(1, 80, "Section title"),
  note: safeOpt(300),
});

export type FeaturedFormValues = z.infer<typeof featuredFormSchema>;
export type DealsBannerFormValues = z.infer<typeof dealsBannerFormSchema>;
export type LaptopRepairFormValues = z.infer<typeof laptopRepairFormSchema>;
export type TopBrandsFormValues = z.infer<typeof topBrandsFormSchema>;
export type PromoSliderFormValues = z.infer<typeof promoSliderFormSchema>;
export type BestSellersFormValues = z.infer<typeof bestSellersFormSchema>;
export type LatestProductsFormValues = z.infer<typeof latestProductsFormSchema>;
export type DealsOfDayFormValues = z.infer<typeof dealsOfDayFormSchema>;
export type ProductGroupsFormValues = z.infer<typeof productGroupsFormSchema>;

export const HOME_COMPONENT_META = [
  {
    key: "featured",
    label: "Featured USPs",
    type: "Icon row",
    where: "Below the hero — four trust / service tiles",
    description: "Short title + description + icon for each benefit.",
  },
  {
    key: "deals_banner",
    label: "Deals banner",
    type: "Promo cards",
    where: "Home mid-page — horizontal deal cards",
    description: "Discount cards with product image and shop link.",
  },
  {
    key: "product_groups",
    label: "Product groups",
    type: "Layout chrome",
    where: "Grouped product area on the home page",
    description: "Section title for the product groups block.",
  },
  {
    key: "promo_slider",
    label: "Promo slider",
    type: "Carousel",
    where: "Full-width promotional slideshow",
    description: "Slides with price, headlines, product art, and CTA.",
  },
  {
    key: "best_sellers",
    label: "Best sellers",
    type: "Products + promo",
    where: "Best sellers grid with left promo panel",
    description: "Promo copy/image plus product list settings.",
  },
  {
    key: "latest_products",
    label: "Latest products",
    type: "Products + sidebar",
    where: "Product grid with latest-items sidebar",
    description: "Titles and how many products to show.",
  },
  {
    key: "deals_of_day",
    label: "Deals of the day",
    type: "Deal layout",
    where: "Three-column deals block",
    description: "Left promo art/copy and product carousel settings.",
  },
  {
    key: "laptop_repair",
    label: "Laptop repair",
    type: "Full banner",
    where: "Dark repair / service banner near the bottom",
    description: "Badge, headlines, offer %, CTA, and images.",
  },
  {
    key: "top_brands",
    label: "Top brands",
    type: "Logo row",
    where: "Bottom brand logo strip",
    description: "Section title and each brand name / link / logo.",
  },
] as const;

export type HomeEditableKey = (typeof HOME_COMPONENT_META)[number]["key"];
