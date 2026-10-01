import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { CONTENT_PAGE_DEFAULTS, readContent, toContentPage } from "../lib/contentPages.js";
import { prisma } from "../lib/prisma.js";
import { revalidateFrontend } from "../lib/revalidate.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import {
  contentPageKeySchema,
  contentSchemaByKey,
  updateContentPageMetaSchema,
  type ContentPageKey,
} from "../validators/contentPage.js";
import { ensureSiteSettings } from "./publicSiteSettings.js";

/**
 * Storefront content pages (FAQ, Terms) — `/api/dashboard/pages/:key`.
 * super_admin and admin only.
 */
export const dashboardPagesRouter = Router();

dashboardPagesRouter.use(requireAuth, requireRoles("super_admin", "admin"));

function parseKey(raw: unknown): ContentPageKey | null {
  const parsed = contentPageKeySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function recordHistory(actorId: bigint, action: string, changes: Record<string, unknown>, note?: string) {
  await ensureSiteSettings();
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

const pageTags = (key: ContentPageKey) => ["pages", `page:${key}`];

dashboardPagesRouter.get("/:key", async (req, res) => {
  const key = parseKey(req.params.key);
  if (!key) return res.status(404).json({ message: "Unknown page — use faq or terms" });
  const row = await prisma.contentPage.findUnique({ where: { page_key: key } });
  return res.json({ page: toContentPage(key, row) });
});

dashboardPagesRouter.patch("/:key", async (req, res) => {
  const key = parseKey(req.params.key);
  if (!key) return res.status(404).json({ message: "Unknown page — use faq or terms" });

  const meta = updateContentPageMetaSchema.safeParse(req.body);
  if (!meta.success) {
    return res.status(400).json({
      message: meta.error.issues[0]?.message ?? "Validation failed",
      errors: meta.error.flatten().fieldErrors,
      issues: meta.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  let content: unknown;
  if (meta.data.content !== undefined) {
    const parsed = contentSchemaByKey[key].safeParse(meta.data.content);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message ?? "Validation failed",
        issues: parsed.error.issues.map((i) => ({ path: ["content", ...i.path].join("."), message: i.message })),
      });
    }
    content = parsed.data;
  }

  const existing = await prisma.contentPage.findUnique({ where: { page_key: key } });
  const { is_published, noindex, seo_title, seo_description } = meta.data;

  const row = await prisma.contentPage.upsert({
    where: { page_key: key },
    create: {
      page_key: key,
      is_published: is_published ?? true,
      noindex: noindex ?? false,
      seo_title: seo_title ?? null,
      seo_description: seo_description ?? null,
      content: (content ?? CONTENT_PAGE_DEFAULTS[key]) as Prisma.InputJsonValue,
      updated_by_id: req.auth!.userId,
    },
    update: {
      ...(is_published !== undefined ? { is_published } : {}),
      ...(noindex !== undefined ? { noindex } : {}),
      ...(seo_title !== undefined ? { seo_title } : {}),
      ...(seo_description !== undefined ? { seo_description } : {}),
      ...(content !== undefined ? { content: content as Prisma.InputJsonValue } : {}),
      updated_by_id: req.auth!.userId,
    },
  });

  const changes: Record<string, unknown> = {};
  for (const field of ["is_published", "noindex", "seo_title", "seo_description"] as const) {
    const next = meta.data[field];
    const prev = existing ? existing[field] : null;
    if (next !== undefined && (prev ?? null) !== (next ?? null)) changes[field] = { from: prev ?? null, to: next ?? null };
  }
  if (content !== undefined && JSON.stringify(existing ? readContent(key, existing.content) : null) !== JSON.stringify(content)) {
    changes.content = "updated";
  }
  if (Object.keys(changes).length > 0) {
    await recordHistory(
      req.auth!.userId,
      `page_${key}_updated`,
      changes,
      changes.is_published ? `${key.toUpperCase()} page ${row.is_published ? "published" : "unpublished"}` : undefined,
    );
  }

  revalidateFrontend(pageTags(key));
  return res.json({ message: "Page saved", page: toContentPage(key, row) });
});

/** Throw away all edits and go back to the built-in default content. */
dashboardPagesRouter.delete("/:key", async (req, res) => {
  const key = parseKey(req.params.key);
  if (!key) return res.status(404).json({ message: "Unknown page — use faq or terms" });

  const deleted = await prisma.contentPage.deleteMany({ where: { page_key: key } });
  if (deleted.count > 0) {
    await recordHistory(req.auth!.userId, `page_${key}_reset`, {}, `${key.toUpperCase()} page reset to defaults`);
  }

  revalidateFrontend(pageTags(key));
  return res.json({ message: "Page reset to the default content", page: toContentPage(key, null) });
});
