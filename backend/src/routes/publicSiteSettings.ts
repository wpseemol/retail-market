import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  ensureSiteChromeDefaults,
  loadHomeSections,
  loadSiteNavTree,
  toPublicNavItem,
} from "../lib/siteChrome.js";
import { toPublicMedia } from "../lib/user.js";

export const publicSiteSettingsRouter = Router();

export const siteSettingsMediaInclude = {
  og_image: true,
  favicon: true,
  login_logo: true,
} as const;

const DEFAULTS = {
  site_name: "Niyenin",
  site_title: "Niyenin | Retail Market",
  site_description:
    "Shop electronics, gadgets, laptops, smartphones, and more at Niyenin Retail Market. Discover daily deals, top brands, and fast delivery.",
  keywords:
    "Niyenin, retail market, online shop, electronics, gadgets, ecommerce",
  twitter_handle: "@niyenin",
  shop_default_view: "grid4",
  shop_products_per_page: 12,
  shop_categories_visible: 5,
  shop_brands_visible: 6,
  shop_see_all_label: "See all",
  shop_show_less_label: "Show less",
  topbar_email: "retailmarket@gmail.com",
  topbar_phone: "+1(213)628-3034",
  footer_blurb:
    "Phasellus justo ligula, dictum sit amet tortor eu, iaculis tristique turpis. Mauris non orci sed est suscipit tempor ut quis felis.",
  footer_phone: "+1(000)000-000",
  footer_callout: "Got Question? Call Us 24/7!",
  social_facebook: "https://facebook.com",
  social_twitter: "https://x.com",
  social_youtube: "https://youtube.com",
  social_linkedin: "https://linkedin.com",
  social_instagram: "https://instagram.com",
} as const;

export async function ensureSiteSettings() {
  const existing = await prisma.siteSettings.findUnique({
    where: { id: 1 },
    include: siteSettingsMediaInclude,
  });
  if (existing) {
    await ensureSiteChromeDefaults();
    return existing;
  }

  const created = await prisma.siteSettings.create({
    data: {
      id: 1,
      ...DEFAULTS,
    },
    include: siteSettingsMediaInclude,
  });
  await ensureSiteChromeDefaults();
  return created;
}

export function toPublicChrome(
  row: Awaited<ReturnType<typeof ensureSiteSettings>>,
) {
  return {
    topbar_email: row.topbar_email,
    topbar_phone: row.topbar_phone,
    footer_blurb: row.footer_blurb,
    footer_phone: row.footer_phone,
    footer_callout: row.footer_callout,
    social: {
      facebook: row.social_facebook,
      twitter: row.social_twitter,
      youtube: row.social_youtube,
      linkedin: row.social_linkedin,
      instagram: row.social_instagram,
    },
  };
}

export function toPublicSiteSettings(
  row: Awaited<ReturnType<typeof ensureSiteSettings>>,
) {
  return {
    site_name: row.site_name,
    site_title: row.site_title,
    site_description: row.site_description,
    keywords: row.keywords,
    og_title: row.og_title,
    og_description: row.og_description,
    og_image: toPublicMedia(row.og_image),
    favicon: toPublicMedia(row.favicon),
    login_logo: toPublicMedia(row.login_logo),
    twitter_title: row.twitter_title,
    twitter_description: row.twitter_description,
    twitter_handle: row.twitter_handle,
    shop: {
      default_view: row.shop_default_view,
      products_per_page: row.shop_products_per_page,
      categories_visible: row.shop_categories_visible,
      brands_visible: row.shop_brands_visible,
      see_all_label: row.shop_see_all_label,
      show_less_label: row.shop_show_less_label,
    },
    chrome: toPublicChrome(row),
    analytics: {
      google_analytics: {
        enabled: row.google_analytics_enabled,
        id: row.google_analytics_id,
      },
      google_tag_manager: {
        enabled: row.google_tag_manager_enabled,
        id: row.google_tag_manager_id,
      },
      hotjar: { enabled: row.hotjar_enabled, id: row.hotjar_site_id },
      plerdy: { enabled: row.plerdy_enabled, id: row.plerdy_site_id },
    },
    pixels: {
      google_ads: { enabled: row.google_ads_enabled, id: row.google_ads_id },
      tiktok: { enabled: row.tiktok_enabled, id: row.tiktok_pixel_id },
      linkedin: {
        enabled: row.linkedin_enabled,
        id: row.linkedin_partner_id,
      },
      twitter: {
        enabled: row.twitter_pixel_enabled,
        id: row.twitter_pixel_id,
      },
      meta: { enabled: row.meta_pixel_enabled, id: row.meta_pixel_id },
    },
    updated_at: row.updated_at,
  };
}

/** Public storefront SEO + chrome + tracking config (no auth). */
publicSiteSettingsRouter.get("/", async (_req, res) => {
  const row = await ensureSiteSettings();
  const [navRows, homeRows] = await Promise.all([
    loadSiteNavTree(false),
    loadHomeSections(false),
  ]);

  const nav = {
    header: navRows
      .filter((n) => n.menu === "header")
      .map(toPublicNavItem),
    footer_find: navRows
      .filter((n) => n.menu === "footer_find")
      .map(toPublicNavItem),
    footer_care: navRows
      .filter((n) => n.menu === "footer_care")
      .map(toPublicNavItem),
    footer_sell: navRows
      .filter((n) => n.menu === "footer_sell")
      .map(toPublicNavItem),
  };

  return res.json({
    settings: {
      ...toPublicSiteSettings(row),
      nav,
      home_sections: homeRows.map((s) => ({
        id: s.id.toString(),
        key: s.key,
        label: s.label,
        position: s.position,
        is_enabled: s.is_enabled,
      })),
    },
  });
});
