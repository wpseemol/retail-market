import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { CATEGORY_IMAGE_MAX_BYTES, finalizeCategoryImageUpload, PRODUCT_IMAGES_RELATIVE, sanitizeOriginalName } from "../lib/categoryImage.js";
import { prisma } from "../lib/prisma.js";
import { revalidateFrontend } from "../lib/revalidate.js";
import { discardUpload, removeStoredMedia, singleImageUpload } from "../lib/showcaseMedia.js";
import { toPublicMedia, toPublicUser, userWithAvatarInclude } from "../lib/user.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { categoryImageUpload } from "../middleware/upload.js";
import { normalizeSeoPages, updateSeoSettingsSchema } from "../validators/seo.js";
import { ensureSiteSettings } from "./publicSiteSettings.js";

/**
 * Global storefront SEO — `/api/dashboard/seo`.
 * super_admin and admin; vendors and moderators get 403.
 */
export const dashboardSeoRouter = Router();

dashboardSeoRouter.use(requireAuth, requireRoles("super_admin", "admin"));

type SettingsRow = Awaited<ReturnType<typeof ensureSiteSettings>>;
type ChangeMap = Record<string, { from: unknown; to: unknown }>;

function toSeoSettings(row: SettingsRow) {
  return {
    site_name: row.site_name,
    site_title: row.site_title,
    site_description: row.site_description,
    keywords: row.keywords,
    seo_title_template: row.seo_title_template,
    og_title: row.og_title,
    og_description: row.og_description,
    og_image: toPublicMedia(row.og_image),
    favicon: toPublicMedia(row.favicon),
    twitter_title: row.twitter_title,
    twitter_description: row.twitter_description,
    twitter_handle: row.twitter_handle,
    google_site_verification: row.google_site_verification,
    bing_site_verification: row.bing_site_verification,
    seo_noindex_site: row.seo_noindex_site,
    seo_pages: normalizeSeoPages(row.seo_pages),
    updated_at: row.updated_at,
  };
}

async function recordHistory(actorId: bigint, action: string, changes: ChangeMap, note?: string) {
  await prisma.siteSettingsHistory.create({
    data: {
      settings_id: 1,
      actor_id: actorId,
      action,
      changes: changes as Prisma.InputJsonValue,
      note: note ?? null,
    },
  });
}

dashboardSeoRouter.get("/", async (_req, res) => {
  const row = await ensureSiteSettings();
  return res.json({ seo: toSeoSettings(row) });
});

dashboardSeoRouter.get("/history", async (_req, res) => {
  const SEO_ACTIONS = ["seo_updated", "seo_og_image_updated", "seo_og_image_removed"];
  const rows = await prisma.siteSettingsHistory.findMany({
    where: { settings_id: 1, action: { in: SEO_ACTIONS } },
    include: { actor: { include: userWithAvatarInclude } },
    orderBy: { created_at: "desc" },
    take: 50,
  });
  return res.json({
    history: rows.map((row) => ({
      id: row.id.toString(),
      action: row.action,
      changes: row.changes,
      note: row.note,
      created_at: row.created_at.toISOString(),
      actor: row.actor ? toPublicUser(row.actor) : null,
    })),
  });
});

dashboardSeoRouter.patch("/", async (req, res) => {
  const parsed = updateSeoSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const data = parsed.data;
  const before = await ensureSiteSettings();

  const scalarKeys = [
    "site_title",
    "site_description",
    "keywords",
    "seo_title_template",
    "og_title",
    "og_description",
    "twitter_title",
    "twitter_description",
    "twitter_handle",
    "google_site_verification",
    "bing_site_verification",
    "seo_noindex_site",
  ] as const;

  const update: Prisma.SiteSettingsUpdateInput = {};
  const changes: ChangeMap = {};
  for (const key of scalarKeys) {
    const next = data[key];
    if (next === undefined) continue;
    (update as Record<string, unknown>)[key] = next;
    if ((before[key] ?? null) !== (next ?? null)) {
      changes[key] = { from: before[key] ?? null, to: next ?? null };
    }
  }

  if (data.seo_pages) {
    const prev = normalizeSeoPages(before.seo_pages);
    const merged = normalizeSeoPages({ ...prev, ...data.seo_pages });
    update.seo_pages = merged as unknown as Prisma.InputJsonValue;
    if (JSON.stringify(prev) !== JSON.stringify(merged)) {
      changes.seo_pages = { from: prev, to: merged };
    }
  }

  const row = await prisma.siteSettings.update({
    where: { id: 1 },
    data: update,
    include: { og_image: true, favicon: true, login_logo: true },
  });

  if (Object.keys(changes).length > 0) {
    await recordHistory(
      req.auth!.userId,
      "seo_updated",
      changes,
      changes.seo_noindex_site ? `Site-wide noindex turned ${data.seo_noindex_site ? "ON" : "OFF"}` : undefined,
    );
  }

  revalidateFrontend(["site-settings"]);
  return res.json({ message: "SEO settings saved", seo: toSeoSettings(row) });
});

/** Default share image — field `image`, 1 MB, resized to 1200×630. */
dashboardSeoRouter.post(
  "/og-image",
  singleImageUpload(categoryImageUpload, "image", "Share image", CATEGORY_IMAGE_MAX_BYTES, "OG_IMAGE"),
  async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "Share image is required (field: image)" });

    const existing = await ensureSiteSettings();
    const finalized = await finalizeCategoryImageUpload(file.path, file.mimetype, "ogImage");
    if (!finalized.ok) {
      discardUpload(file);
      return res.status(400).json({
        message: finalized.message.replace(/^Category image/i, "Share image"),
        code: finalized.code?.replace(/^CATEGORY_IMAGE_/, "OG_IMAGE_"),
      });
    }

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
      include: { og_image: true, favicon: true, login_logo: true },
    });
    if (existing.og_image && existing.og_image.id !== media.id) {
      await removeStoredMedia(existing.og_image);
    }
    await recordHistory(req.auth!.userId, "seo_og_image_updated", {
      og_image_id: { from: existing.og_image_id?.toString() ?? null, to: media.id.toString() },
    });

    revalidateFrontend(["site-settings"]);
    return res.json({ message: "Share image updated", seo: toSeoSettings(row) });
  },
);

dashboardSeoRouter.delete("/og-image", async (req, res) => {
  const existing = await ensureSiteSettings();
  if (!existing.og_image) {
    return res.status(404).json({ message: "No default share image is set" });
  }

  const row = await prisma.siteSettings.update({
    where: { id: 1 },
    data: { og_image_id: null },
    include: { og_image: true, favicon: true, login_logo: true },
  });
  await removeStoredMedia(existing.og_image);
  await recordHistory(req.auth!.userId, "seo_og_image_removed", {
    og_image_id: { from: existing.og_image.id.toString(), to: null },
  });

  revalidateFrontend(["site-settings"]);
  return res.json({ message: "Share image removed", seo: toSeoSettings(row) });
});
