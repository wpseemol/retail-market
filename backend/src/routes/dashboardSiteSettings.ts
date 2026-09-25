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
import {
  createSiteNavItemSchema,
  reorderHomeSectionsSchema,
  reorderSiteNavSchema,
  updateHomeSectionSchema,
  updateSiteChromeSchema,
  updateSiteNavItemSchema,
  updateSiteSettingsSchema,
} from "../validators/siteSettings.js";
import {
  loadHomeSections,
  loadSiteNavTree,
  toDashboardNavItem,
} from "../lib/siteChrome.js";
import {
  ensureSiteSettings,
  siteSettingsMediaInclude,
  toPublicSiteSettings,
} from "./publicSiteSettings.js";

export const dashboardSiteSettingsRouter = Router();

dashboardSiteSettingsRouter.use(requireAuth, requireRoles("super_admin"));

type ChangeMap = Record<string, { from: unknown; to: unknown }>;

type SiteMediaField = "og_image_id" | "favicon_id" | "login_logo_id";
type SiteMediaRelation = "og_image" | "favicon" | "login_logo";

async function toDashboardSettings(
  row: Awaited<ReturnType<typeof ensureSiteSettings>>,
) {
  const [navRows, homeRows] = await Promise.all([
    loadSiteNavTree(true),
    loadHomeSections(true),
  ]);
  const nav = {
    header: navRows.filter((n) => n.menu === "header").map(toDashboardNavItem),
    footer_find: navRows
      .filter((n) => n.menu === "footer_find")
      .map(toDashboardNavItem),
    footer_care: navRows
      .filter((n) => n.menu === "footer_care")
      .map(toDashboardNavItem),
    footer_sell: navRows
      .filter((n) => n.menu === "footer_sell")
      .map(toDashboardNavItem),
  };

  return {
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
    topbar_email: row.topbar_email,
    topbar_phone: row.topbar_phone,
    footer_blurb: row.footer_blurb,
    footer_phone: row.footer_phone,
    footer_callout: row.footer_callout,
    social_facebook: row.social_facebook,
    social_twitter: row.social_twitter,
    social_youtube: row.social_youtube,
    social_linkedin: row.social_linkedin,
    social_instagram: row.social_instagram,
    og_image_id: row.og_image_id?.toString() ?? null,
    favicon_id: row.favicon_id?.toString() ?? null,
    login_logo_id: row.login_logo_id?.toString() ?? null,
    nav,
    home_sections: homeRows.map((s) => ({
      id: s.id.toString(),
      key: s.key,
      label: s.label,
      position: s.position,
      is_enabled: s.is_enabled,
    })),
  };
}

function siteImageUploadMiddleware(label: string, codePrefix: string) {
  return (
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    categoryImageUpload.single("image")(req, res, (err) => {
      if (err) {
        const isTooLarge =
          err instanceof Error &&
          ("code" in err
            ? (err as { code?: string }).code === "LIMIT_FILE_SIZE"
            : /file too large|File too large/i.test(err.message));
        return res.status(400).json({
          message: isTooLarge
            ? `${label} must be ${Math.floor(CATEGORY_IMAGE_MAX_BYTES / (1024 * 1024))} MB or smaller`
            : err instanceof Error
              ? err.message
              : "Upload failed",
          code: isTooLarge ? `${codePrefix}_TOO_LARGE` : undefined,
        });
      }
      return next();
    });
  };
}

async function handleSiteImageUpload(input: {
  req: import("express").Request;
  res: import("express").Response;
  label: string;
  codePrefix: string;
  action: string;
  successMessage: string;
  field: SiteMediaField;
  relation: SiteMediaRelation;
}) {
  const file = input.req.file;
  if (!file) {
    return input.res.status(400).json({
      message: `${input.label} is required (field: image)`,
    });
  }

  const existing = await ensureSiteSettings();
  const finalized = await finalizeCategoryImageUpload(
    file.path,
    file.mimetype,
  );
  if (!finalized.ok) {
    return input.res.status(400).json({
      message: finalized.message.replace(/^Category/i, input.label),
      code: finalized.code?.replace(/^CATEGORY_/, `${input.codePrefix}_`),
    });
  }

  try {
    const media = await prisma.media.create({
      data: {
        user_id: input.req.auth!.userId,
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
      data: { [input.field]: media.id },
      include: siteSettingsMediaInclude,
    });

    const previousMedia = existing[input.relation];
    const previousId = existing[input.field];

    await recordSiteSettingsHistory({
      actorId: input.req.auth!.userId,
      action: input.action,
      changes: {
        [input.field]: {
          from: previousId?.toString() ?? null,
          to: media.id.toString(),
        },
      },
    });

    if (previousMedia && previousMedia.id !== media.id) {
      const oldPath = path.join(PRODUCT_IMAGES_DIR, previousMedia.file_name);
      try {
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch {
        /* ignore */
      }
      await prisma.media
        .delete({ where: { id: previousMedia.id } })
        .catch(() => undefined);
    }

    return input.res.json({
      message: input.successMessage,
      settings: await toDashboardSettings(row),
    });
  } catch (err) {
    try {
      fs.unlinkSync(path.join(PRODUCT_IMAGES_DIR, finalized.fileName));
    } catch {
      /* ignore */
    }
    throw err;
  }
}

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
    settings: await toDashboardSettings(row),
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
    include: siteSettingsMediaInclude,
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
    settings: await toDashboardSettings(row),
  });
});

/** Upload / replace Open Graph share image — max 1 MB, resized. */
dashboardSiteSettingsRouter.post(
  "/og-image",
  siteImageUploadMiddleware("OG image", "OG_IMAGE"),
  async (req, res) => {
    await handleSiteImageUpload({
      req,
      res,
      label: "OG image",
      codePrefix: "OG",
      action: "og_image_updated",
      successMessage: "Open Graph image updated",
      field: "og_image_id",
      relation: "og_image",
    });
  },
);

/** Upload / replace favicon — max 1 MB, resized. */
dashboardSiteSettingsRouter.post(
  "/favicon",
  siteImageUploadMiddleware("Favicon", "FAVICON"),
  async (req, res) => {
    await handleSiteImageUpload({
      req,
      res,
      label: "Favicon",
      codePrefix: "FAVICON",
      action: "favicon_updated",
      successMessage: "Favicon updated",
      field: "favicon_id",
      relation: "favicon",
    });
  },
);

/** Upload / replace login logo — max 1 MB, resized. */
dashboardSiteSettingsRouter.post(
  "/login-logo",
  siteImageUploadMiddleware("Login logo", "LOGIN_LOGO"),
  async (req, res) => {
    await handleSiteImageUpload({
      req,
      res,
      label: "Login logo",
      codePrefix: "LOGIN_LOGO",
      action: "login_logo_updated",
      successMessage: "Login logo updated",
      field: "login_logo_id",
      relation: "login_logo",
    });
  },
);

/** Patch header/footer chrome fields only. */
dashboardSiteSettingsRouter.patch("/chrome", async (req, res) => {
  const parsed = updateSiteChromeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const before = await ensureSiteSettings();
  const data = parsed.data;
  const changes: ChangeMap = {};
  const fields = [
    "topbar_email",
    "topbar_phone",
    "footer_blurb",
    "footer_phone",
    "footer_callout",
    "social_facebook",
    "social_twitter",
    "social_youtube",
    "social_linkedin",
    "social_instagram",
  ] as const;

  for (const key of fields) {
    if (data[key] !== undefined) {
      trackChange(changes, key, before[key], data[key] ?? null);
    }
  }

  const row = await prisma.siteSettings.update({
    where: { id: 1 },
    data: {
      ...(data.topbar_email !== undefined
        ? { topbar_email: data.topbar_email }
        : {}),
      ...(data.topbar_phone !== undefined
        ? { topbar_phone: data.topbar_phone }
        : {}),
      ...(data.footer_blurb !== undefined
        ? { footer_blurb: data.footer_blurb }
        : {}),
      ...(data.footer_phone !== undefined
        ? { footer_phone: data.footer_phone }
        : {}),
      ...(data.footer_callout !== undefined
        ? { footer_callout: data.footer_callout }
        : {}),
      ...(data.social_facebook !== undefined
        ? { social_facebook: data.social_facebook }
        : {}),
      ...(data.social_twitter !== undefined
        ? { social_twitter: data.social_twitter }
        : {}),
      ...(data.social_youtube !== undefined
        ? { social_youtube: data.social_youtube }
        : {}),
      ...(data.social_linkedin !== undefined
        ? { social_linkedin: data.social_linkedin }
        : {}),
      ...(data.social_instagram !== undefined
        ? { social_instagram: data.social_instagram }
        : {}),
    },
    include: siteSettingsMediaInclude,
  });

  if (Object.keys(changes).length > 0) {
    await recordSiteSettingsHistory({
      actorId: req.auth!.userId,
      action: "chrome_updated",
      changes,
    });
  }

  return res.json({
    message: "Header / footer chrome saved",
    settings: await toDashboardSettings(row),
  });
});

dashboardSiteSettingsRouter.post("/nav", async (req, res) => {
  const parsed = createSiteNavItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }
  await ensureSiteSettings();
  const data = parsed.data;
  const parentId = data.parent_id ? BigInt(data.parent_id) : null;
  const maxPos = await prisma.siteNavItem.aggregate({
    where: {
      settings_id: 1,
      menu: data.menu,
      parent_id: parentId,
    },
    _max: { position: true },
  });
  const item = await prisma.siteNavItem.create({
    data: {
      settings_id: 1,
      menu: data.menu,
      label: data.label,
      href: data.href,
      external: data.external,
      is_enabled: data.is_enabled,
      parent_id: parentId,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });
  await recordSiteSettingsHistory({
    actorId: req.auth!.userId,
    action: "nav_created",
    changes: {
      nav_item: { from: null, to: { id: item.id.toString(), label: item.label } },
    },
  });
  const row = await ensureSiteSettings();
  return res.status(201).json({
    message: "Menu item created",
    settings: await toDashboardSettings(row),
  });
});

dashboardSiteSettingsRouter.patch("/nav/:id", async (req, res) => {
  const id = BigInt(String(req.params.id));
  const parsed = updateSiteNavItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }
  const existing = await prisma.siteNavItem.findFirst({
    where: { id, settings_id: 1 },
  });
  if (!existing) {
    return res.status(404).json({ message: "Menu item not found" });
  }
  const data = parsed.data;
  await prisma.siteNavItem.update({
    where: { id },
    data: {
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.href !== undefined ? { href: data.href } : {}),
      ...(data.external !== undefined ? { external: data.external } : {}),
      ...(data.is_enabled !== undefined ? { is_enabled: data.is_enabled } : {}),
      ...(data.parent_id !== undefined
        ? { parent_id: data.parent_id ? BigInt(data.parent_id) : null }
        : {}),
    },
  });
  await recordSiteSettingsHistory({
    actorId: req.auth!.userId,
    action: "nav_updated",
    changes: {
      nav_item_id: { from: id.toString(), to: id.toString() },
    },
  });
  const row = await ensureSiteSettings();
  return res.json({
    message: "Menu item updated",
    settings: await toDashboardSettings(row),
  });
});

dashboardSiteSettingsRouter.delete("/nav/:id", async (req, res) => {
  const id = BigInt(String(req.params.id));
  const existing = await prisma.siteNavItem.findFirst({
    where: { id, settings_id: 1 },
  });
  if (!existing) {
    return res.status(404).json({ message: "Menu item not found" });
  }
  await prisma.siteNavItem.delete({ where: { id } });
  await recordSiteSettingsHistory({
    actorId: req.auth!.userId,
    action: "nav_deleted",
    changes: {
      nav_item: {
        from: { id: id.toString(), label: existing.label },
        to: null,
      },
    },
  });
  const row = await ensureSiteSettings();
  return res.json({
    message: "Menu item deleted",
    settings: await toDashboardSettings(row),
  });
});

dashboardSiteSettingsRouter.put("/nav/reorder", async (req, res) => {
  const parsed = reorderSiteNavSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
    });
  }
  const { menu, ordered_ids } = parsed.data;
  await ensureSiteSettings();
  await prisma.$transaction(
    ordered_ids.map((id, index) =>
      prisma.siteNavItem.updateMany({
        where: {
          id: BigInt(id),
          settings_id: 1,
          menu,
          parent_id: null,
        },
        data: { position: index },
      }),
    ),
  );
  await recordSiteSettingsHistory({
    actorId: req.auth!.userId,
    action: "nav_reordered",
    changes: { menu: { from: menu, to: ordered_ids } },
  });
  const row = await ensureSiteSettings();
  return res.json({
    message: "Menu order saved",
    settings: await toDashboardSettings(row),
  });
});

dashboardSiteSettingsRouter.patch("/home-sections/:id", async (req, res) => {
  const id = BigInt(String(req.params.id));
  const parsed = updateHomeSectionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
    });
  }
  const existing = await prisma.homeSection.findFirst({
    where: { id, settings_id: 1 },
  });
  if (!existing) {
    return res.status(404).json({ message: "Home section not found" });
  }
  await prisma.homeSection.update({
    where: { id },
    data: {
      ...(parsed.data.is_enabled !== undefined
        ? { is_enabled: parsed.data.is_enabled }
        : {}),
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
    },
  });
  await recordSiteSettingsHistory({
    actorId: req.auth!.userId,
    action: "home_section_updated",
    changes: {
      home_section: { from: existing.key, to: parsed.data },
    },
  });
  const row = await ensureSiteSettings();
  return res.json({
    message: "Home section updated",
    settings: await toDashboardSettings(row),
  });
});

dashboardSiteSettingsRouter.put("/home-sections/reorder", async (req, res) => {
  const parsed = reorderHomeSectionsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
    });
  }
  await ensureSiteSettings();
  await prisma.$transaction(
    parsed.data.ordered_ids.map((id, index) =>
      prisma.homeSection.updateMany({
        where: { id: BigInt(id), settings_id: 1 },
        data: { position: index },
      }),
    ),
  );
  await recordSiteSettingsHistory({
    actorId: req.auth!.userId,
    action: "home_sections_reordered",
    changes: { ordered_ids: { from: null, to: parsed.data.ordered_ids } },
  });
  const row = await ensureSiteSettings();
  return res.json({
    message: "Home section order saved",
    settings: await toDashboardSettings(row),
  });
});

