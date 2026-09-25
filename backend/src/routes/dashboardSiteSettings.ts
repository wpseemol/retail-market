import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import {
  finalizeCategoryImageUpload,
  CATEGORY_IMAGE_MAX_BYTES,
  PRODUCT_IMAGES_RELATIVE,
  sanitizeOriginalName,
} from "../lib/categoryImage.js";
import { PRODUCT_IMAGES_DIR } from "../lib/productImage.js";
import { prisma } from "../lib/prisma.js";
import { toPublicUser, userWithAvatarInclude } from "../lib/user.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { categoryImageUpload } from "../middleware/upload.js";
import { updateSiteSettingsSchema } from "../validators/siteSettings.js";
import {
  ensureSiteSettings,
  toPublicSiteSettings,
} from "./publicSiteSettings.js";

export const dashboardSiteSettingsRouter = Router();

dashboardSiteSettingsRouter.use(requireAuth, requireRoles("super_admin"));

type ChangeMap = Record<string, { from: unknown; to: unknown }>;

async function recordSiteSettingsHistory(input: {
  actorId: bigint;
  action: string;
  changes?: ChangeMap | null;
  note?: string | null;
}) {
  await prisma.siteSettingsHistory.create({
    data: {
      settings_id: 1,
      actor_id: input.actorId,
      action: input.action,
      changes: (input.changes ?? undefined) as Prisma.InputJsonValue | undefined,
      note: input.note ?? null,
    },
  });
}

function trackChange(
  changes: ChangeMap,
  key: string,
  from: unknown,
  to: unknown,
) {
  const a = from ?? null;
  const b = to ?? null;
  if (a === b) return;
  if (String(a) === String(b)) return;
  changes[key] = { from: a, to: b };
}

function toPublicHistoryRow(row: {
  id: bigint;
  action: string;
  changes: Prisma.JsonValue;
  note: string | null;
  created_at: Date;
  actor: Parameters<typeof toPublicUser>[0] | null;
}) {
  return {
    id: row.id.toString(),
    action: row.action,
    changes: row.changes,
    note: row.note,
    created_at: row.created_at.toISOString(),
    actor: row.actor ? toPublicUser(row.actor) : null,
  };
}

dashboardSiteSettingsRouter.get("/history", async (_req, res) => {
  await ensureSiteSettings();
  const rows = await prisma.siteSettingsHistory.findMany({
    where: { settings_id: 1 },
    include: { actor: { include: userWithAvatarInclude } },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  return res.json({
    history: rows.map((row) => toPublicHistoryRow(row)),
  });
});

dashboardSiteSettingsRouter.delete("/history", async (_req, res) => {
  const result = await prisma.siteSettingsHistory.deleteMany({
    where: { settings_id: 1 },
  });
  return res.json({
    message: "Site settings history cleared",
    deleted: result.count,
  });
});

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

  const before = await ensureSiteSettings();
  const data = parsed.data;

  const changes: ChangeMap = {};
  trackChange(changes, "site_name", before.site_name, data.site_name);
  trackChange(changes, "site_title", before.site_title, data.site_title);
  trackChange(
    changes,
    "site_description",
    before.site_description,
    data.site_description,
  );
  trackChange(changes, "keywords", before.keywords, data.keywords ?? null);
  trackChange(changes, "og_title", before.og_title, data.og_title ?? null);
  trackChange(
    changes,
    "og_description",
    before.og_description,
    data.og_description ?? null,
  );
  trackChange(
    changes,
    "twitter_title",
    before.twitter_title,
    data.twitter_title ?? null,
  );
  trackChange(
    changes,
    "twitter_description",
    before.twitter_description,
    data.twitter_description ?? null,
  );
  trackChange(
    changes,
    "twitter_handle",
    before.twitter_handle,
    data.twitter_handle ?? null,
  );
  trackChange(
    changes,
    "google_analytics_id",
    before.google_analytics_id,
    data.google_analytics_id ?? null,
  );
  trackChange(
    changes,
    "google_analytics_enabled",
    before.google_analytics_enabled,
    data.google_analytics_enabled ?? false,
  );
  trackChange(
    changes,
    "google_tag_manager_id",
    before.google_tag_manager_id,
    data.google_tag_manager_id ?? null,
  );
  trackChange(
    changes,
    "google_tag_manager_enabled",
    before.google_tag_manager_enabled,
    data.google_tag_manager_enabled ?? false,
  );
  trackChange(
    changes,
    "hotjar_site_id",
    before.hotjar_site_id,
    data.hotjar_site_id ?? null,
  );
  trackChange(
    changes,
    "hotjar_enabled",
    before.hotjar_enabled,
    data.hotjar_enabled ?? false,
  );
  trackChange(
    changes,
    "plerdy_site_id",
    before.plerdy_site_id,
    data.plerdy_site_id ?? null,
  );
  trackChange(
    changes,
    "plerdy_enabled",
    before.plerdy_enabled,
    data.plerdy_enabled ?? false,
  );
  trackChange(
    changes,
    "google_ads_id",
    before.google_ads_id,
    data.google_ads_id ?? null,
  );
  trackChange(
    changes,
    "google_ads_enabled",
    before.google_ads_enabled,
    data.google_ads_enabled ?? false,
  );
  trackChange(
    changes,
    "tiktok_pixel_id",
    before.tiktok_pixel_id,
    data.tiktok_pixel_id ?? null,
  );
  trackChange(
    changes,
    "tiktok_enabled",
    before.tiktok_enabled,
    data.tiktok_enabled ?? false,
  );
  trackChange(
    changes,
    "linkedin_partner_id",
    before.linkedin_partner_id,
    data.linkedin_partner_id ?? null,
  );
  trackChange(
    changes,
    "linkedin_enabled",
    before.linkedin_enabled,
    data.linkedin_enabled ?? false,
  );
  trackChange(
    changes,
    "twitter_pixel_id",
    before.twitter_pixel_id,
    data.twitter_pixel_id ?? null,
  );
  trackChange(
    changes,
    "twitter_pixel_enabled",
    before.twitter_pixel_enabled,
    data.twitter_pixel_enabled ?? false,
  );
  trackChange(
    changes,
    "meta_pixel_id",
    before.meta_pixel_id,
    data.meta_pixel_id ?? null,
  );
  trackChange(
    changes,
    "meta_pixel_enabled",
    before.meta_pixel_enabled,
    data.meta_pixel_enabled ?? false,
  );
  if (data.shop_default_view !== undefined) {
    trackChange(
      changes,
      "shop_default_view",
      before.shop_default_view,
      data.shop_default_view,
    );
  }
  if (data.shop_products_per_page !== undefined) {
    trackChange(
      changes,
      "shop_products_per_page",
      before.shop_products_per_page,
      data.shop_products_per_page,
    );
  }
  if (data.shop_categories_visible !== undefined) {
    trackChange(
      changes,
      "shop_categories_visible",
      before.shop_categories_visible,
      data.shop_categories_visible,
    );
  }
  if (data.shop_brands_visible !== undefined) {
    trackChange(
      changes,
      "shop_brands_visible",
      before.shop_brands_visible,
      data.shop_brands_visible,
    );
  }
  if (data.shop_see_all_label !== undefined) {
    trackChange(
      changes,
      "shop_see_all_label",
      before.shop_see_all_label,
      data.shop_see_all_label,
    );
  }
  if (data.shop_show_less_label !== undefined) {
    trackChange(
      changes,
      "shop_show_less_label",
      before.shop_show_less_label,
      data.shop_show_less_label,
    );
  }

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

  if (Object.keys(changes).length > 0) {
    await recordSiteSettingsHistory({
      actorId: req.auth!.userId,
      action: "updated",
      changes,
    });
  }

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

      await recordSiteSettingsHistory({
        actorId: req.auth!.userId,
        action: "og_image_updated",
        changes: {
          og_image_id: {
            from: existing.og_image_id?.toString() ?? null,
            to: media.id.toString(),
          },
        },
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
