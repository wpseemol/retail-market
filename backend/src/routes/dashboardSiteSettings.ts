import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import {
  finalizeCategoryImageUpload,
  CATEGORY_IMAGE_MAX_BYTES,
  PRODUCT_IMAGES_RELATIVE,
  sanitizeOriginalName,
} from "../lib/categoryImage.js";
import { PRODUCT_IMAGES_DIR } from "../lib/productImage.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { categoryImageUpload } from "../middleware/upload.js";
import { updateSiteSettingsSchema } from "../validators/siteSettings.js";
import {
  ensureSiteSettings,
  toPublicSiteSettings,
} from "./publicSiteSettings.js";

export const dashboardSiteSettingsRouter = Router();

dashboardSiteSettingsRouter.use(requireAuth, requireRoles("super_admin"));

dashboardSiteSettingsRouter.get("/", async (_req, res) => {
  const row = await ensureSiteSettings();
  return res.json({
    settings: {
      ...toPublicSiteSettings(row),
      // Flat IDs for the dashboard form
      google_analytics_id: row.google_analytics_id,
      google_analytics_enabled: row.google_analytics_enabled,
      google_tag_manager_id: row.google_tag_manager_id,
      google_tag_manager_enabled: row.google_tag_manager_enabled,
      hotjar_site_id: row.hotjar_site_id,
      hotjar_enabled: row.hotjar_enabled,
      plerdy_site_id: row.plerdy_site_id,
      plerdy_enabled: row.plerdy_enabled,
      google_ads_id: row.google_ads_id,
      google_ads_enabled: row.google_ads_enabled,
      tiktok_pixel_id: row.tiktok_pixel_id,
      tiktok_enabled: row.tiktok_enabled,
      linkedin_partner_id: row.linkedin_partner_id,
      linkedin_enabled: row.linkedin_enabled,
      twitter_pixel_id: row.twitter_pixel_id,
      twitter_pixel_enabled: row.twitter_pixel_enabled,
      meta_pixel_id: row.meta_pixel_id,
      meta_pixel_enabled: row.meta_pixel_enabled,
      shop_default_view: row.shop_default_view,
      shop_products_per_page: row.shop_products_per_page,
      shop_categories_visible: row.shop_categories_visible,
      shop_brands_visible: row.shop_brands_visible,
      shop_see_all_label: row.shop_see_all_label,
      shop_show_less_label: row.shop_show_less_label,
      og_image_id: row.og_image_id?.toString() ?? null,
    },
  });
});

dashboardSiteSettingsRouter.patch("/", async (req, res) => {
  const parsed = updateSiteSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  await ensureSiteSettings();
  const data = parsed.data;

  const row = await prisma.siteSettings.update({
    where: { id: 1 },
    data: {
      site_name: data.site_name,
      site_title: data.site_title,
      site_description: data.site_description,
      keywords: data.keywords ?? null,
      og_title: data.og_title ?? null,
      og_description: data.og_description ?? null,
      twitter_title: data.twitter_title ?? null,
      twitter_description: data.twitter_description ?? null,
      twitter_handle: data.twitter_handle ?? null,
      google_analytics_id: data.google_analytics_id ?? null,
      google_analytics_enabled: data.google_analytics_enabled ?? false,
      google_tag_manager_id: data.google_tag_manager_id ?? null,
      google_tag_manager_enabled: data.google_tag_manager_enabled ?? false,
      hotjar_site_id: data.hotjar_site_id ?? null,
      hotjar_enabled: data.hotjar_enabled ?? false,
      plerdy_site_id: data.plerdy_site_id ?? null,
      plerdy_enabled: data.plerdy_enabled ?? false,
      google_ads_id: data.google_ads_id ?? null,
      google_ads_enabled: data.google_ads_enabled ?? false,
      tiktok_pixel_id: data.tiktok_pixel_id ?? null,
      tiktok_enabled: data.tiktok_enabled ?? false,
      linkedin_partner_id: data.linkedin_partner_id ?? null,
      linkedin_enabled: data.linkedin_enabled ?? false,
      twitter_pixel_id: data.twitter_pixel_id ?? null,
      twitter_pixel_enabled: data.twitter_pixel_enabled ?? false,
      meta_pixel_id: data.meta_pixel_id ?? null,
      meta_pixel_enabled: data.meta_pixel_enabled ?? false,
      ...(data.shop_default_view !== undefined
        ? { shop_default_view: data.shop_default_view }
        : {}),
      ...(data.shop_products_per_page !== undefined
        ? { shop_products_per_page: data.shop_products_per_page }
        : {}),
      ...(data.shop_categories_visible !== undefined
        ? { shop_categories_visible: data.shop_categories_visible }
        : {}),
      ...(data.shop_brands_visible !== undefined
        ? { shop_brands_visible: data.shop_brands_visible }
        : {}),
      ...(data.shop_see_all_label !== undefined
        ? { shop_see_all_label: data.shop_see_all_label }
        : {}),
      ...(data.shop_show_less_label !== undefined
        ? { shop_show_less_label: data.shop_show_less_label }
        : {}),
    },
    include: { og_image: true },
  });

  return res.json({
    message: "Site settings saved",
    settings: {
      ...toPublicSiteSettings(row),
      google_analytics_id: row.google_analytics_id,
      google_analytics_enabled: row.google_analytics_enabled,
      google_tag_manager_id: row.google_tag_manager_id,
      google_tag_manager_enabled: row.google_tag_manager_enabled,
      hotjar_site_id: row.hotjar_site_id,
      hotjar_enabled: row.hotjar_enabled,
      plerdy_site_id: row.plerdy_site_id,
      plerdy_enabled: row.plerdy_enabled,
      google_ads_id: row.google_ads_id,
      google_ads_enabled: row.google_ads_enabled,
      tiktok_pixel_id: row.tiktok_pixel_id,
      tiktok_enabled: row.tiktok_enabled,
      linkedin_partner_id: row.linkedin_partner_id,
      linkedin_enabled: row.linkedin_enabled,
      twitter_pixel_id: row.twitter_pixel_id,
      twitter_pixel_enabled: row.twitter_pixel_enabled,
      meta_pixel_id: row.meta_pixel_id,
      meta_pixel_enabled: row.meta_pixel_enabled,
      shop_default_view: row.shop_default_view,
      shop_products_per_page: row.shop_products_per_page,
      shop_categories_visible: row.shop_categories_visible,
      shop_brands_visible: row.shop_brands_visible,
      shop_see_all_label: row.shop_see_all_label,
      shop_show_less_label: row.shop_show_less_label,
      og_image_id: row.og_image_id?.toString() ?? null,
    },
  });
});

/** Upload / replace Open Graph share image — max 1 MB, resized. */
dashboardSiteSettingsRouter.post(
  "/og-image",
  (req, res, next) => {
    categoryImageUpload.single("image")(req, res, (err) => {
      if (err) {
        const isTooLarge =
          err instanceof Error &&
          ("code" in err
            ? (err as { code?: string }).code === "LIMIT_FILE_SIZE"
            : /file too large|File too large/i.test(err.message));
        return res.status(400).json({
          message: isTooLarge
            ? `OG image must be ${Math.floor(CATEGORY_IMAGE_MAX_BYTES / (1024 * 1024))} MB or smaller`
            : err instanceof Error
              ? err.message
              : "Upload failed",
          code: isTooLarge ? "OG_IMAGE_TOO_LARGE" : undefined,
        });
      }
      return next();
    });
  },
  async (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "OG image is required (field: image)",
      });
    }

    const existing = await ensureSiteSettings();
    const finalized = await finalizeCategoryImageUpload(
      file.path,
      file.mimetype,
    );
    if (!finalized.ok) {
      return res.status(400).json({
        message: finalized.message.replace(/^Category/i, "OG"),
        code: finalized.code?.replace(/^CATEGORY_/, "OG_"),
      });
    }

    try {
      const media = await prisma.media.create({
        data: {
          user_id: req.auth!.userId,
          disk: "public",
          file_name: finalized.fileName,
          original_name: sanitizeOriginalName(file.originalname),
          file_path: PRODUCT_IMAGES_RELATIVE,
          file_size: BigInt(finalized.size),
          mime_type: finalized.detected.mime,
          alt_text: existing.site_name.slice(0, 255),
          collection_name: "site_banners",
          is_public: true,
          mediable_type: "SiteSettings",
          mediable_id: BigInt(1),
          sort_order: 0,
        },
      });

      const row = await prisma.siteSettings.update({
        where: { id: 1 },
        data: { og_image_id: media.id },
        include: { og_image: true },
      });

      if (existing.og_image && existing.og_image.id !== media.id) {
        const oldPath = path.join(
          PRODUCT_IMAGES_DIR,
          existing.og_image.file_name,
        );
        try {
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch {
          /* ignore */
        }
        await prisma.media
          .delete({ where: { id: existing.og_image.id } })
          .catch(() => undefined);
      }

      return res.json({
        message: "Open Graph image updated",
        settings: {
          ...toPublicSiteSettings(row),
          og_image_id: row.og_image_id?.toString() ?? null,
        },
      });
    } catch (err) {
      try {
        fs.unlinkSync(path.join(PRODUCT_IMAGES_DIR, finalized.fileName));
      } catch {
        /* ignore */
      }
      throw err;
    }
  },
);
