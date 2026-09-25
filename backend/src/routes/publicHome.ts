import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { toPublicMedia } from "../lib/user.js";

export const publicHomeRouter = Router();

const HERO_MEDIA_INCLUDE = {
  main_product_image: true,
  main_bg_image: true,
  side_product_image: true,
  side_bg_image: true,
} as const;

const HERO_DEFAULTS = {
  main_eyebrow: "Widescreen 4k .......",
  main_headline: "DIGITAL SLR CAMERA HIGH DEFINITION",
  main_subtext: "Sumptuous, filling, and temptingly",
  main_discount_percent: 70,
  main_price_label: "$ 180.99",
  main_cta_label: "SHOP NOW",
  main_cta_href: "/shop",
  side_badge_label: "New",
  side_offer_percent: 25,
  side_offer_label: "offer",
  side_headline: "CLOUD CAM, SECURITY CAMERA",
  side_discount_percent: 70,
  side_cta_label: "SHOP NOW",
  side_cta_href: "/shop",
} as const;

export async function ensureHomeHeroBanner() {
  const existing = await prisma.homeHeroBanner.findUnique({
    where: { id: 1 },
    include: HERO_MEDIA_INCLUDE,
  });
  if (existing) return existing;

  return prisma.homeHeroBanner.create({
    data: { id: 1, ...HERO_DEFAULTS },
    include: HERO_MEDIA_INCLUDE,
  });
}

export function toPublicHomeHero(
  row: Awaited<ReturnType<typeof ensureHomeHeroBanner>>,
) {
  return {
    main: {
      eyebrow: row.main_eyebrow,
      headline: row.main_headline,
      subtext: row.main_subtext,
      discount_percent: row.main_discount_percent,
      price_label: row.main_price_label,
      cta_label: row.main_cta_label,
      cta_href: row.main_cta_href,
      product_image: toPublicMedia(row.main_product_image),
      bg_image: toPublicMedia(row.main_bg_image),
    },
    side: {
      badge_label: row.side_badge_label,
      offer_percent: row.side_offer_percent,
      offer_label: row.side_offer_label,
      headline: row.side_headline,
      discount_percent: row.side_discount_percent,
      cta_label: row.side_cta_label,
      cta_href: row.side_cta_href,
      product_image: toPublicMedia(row.side_product_image),
      bg_image: toPublicMedia(row.side_bg_image),
    },
    updated_at: row.updated_at,
  };
}

/** Public home hero — no auth. Cached by storefront SSR. */
publicHomeRouter.get("/hero", async (_req, res) => {
  const row = await ensureHomeHeroBanner();
  return res.json({ hero: toPublicHomeHero(row) });
});
