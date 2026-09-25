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
import {
  ensureHomeHeroBanner,
  toPublicHomeHero,
} from "./publicHome.js";
import {
  homeHeroImageSlotSchema,
  updateHomeHeroSchema,
  type HomeHeroImageSlot,
} from "../validators/homeHero.js";

export const dashboardHomeHeroRouter = Router();

dashboardHomeHeroRouter.use(requireAuth, requireRoles("super_admin"));

const HERO_MEDIA_INCLUDE = {
  main_product_image: true,
  main_bg_image: true,
  side_product_image: true,
  side_bg_image: true,
} as const;

const SLOT_FIELD: Record<
  HomeHeroImageSlot,
  {
    idField:
      | "main_product_image_id"
      | "main_bg_image_id"
      | "side_product_image_id"
      | "side_bg_image_id";
    relation:
      | "main_product_image"
      | "main_bg_image"
      | "side_product_image"
      | "side_bg_image";
    label: string;
  }
> = {
  main_product: {
    idField: "main_product_image_id",
    relation: "main_product_image",
    label: "Main product image",
  },
  main_bg: {
    idField: "main_bg_image_id",
    relation: "main_bg_image",
    label: "Main background image",
  },
  side_product: {
    idField: "side_product_image_id",
    relation: "side_product_image",
    label: "Side product image",
  },
  side_bg: {
    idField: "side_bg_image_id",
    relation: "side_bg_image",
    label: "Side background image",
  },
};

function toDashboardHero(
  row: Awaited<ReturnType<typeof ensureHomeHeroBanner>>,
) {
  const publicHero = toPublicHomeHero(row);
  return {
    ...publicHero,
    main_product_image_id: row.main_product_image_id?.toString() ?? null,
    main_bg_image_id: row.main_bg_image_id?.toString() ?? null,
    side_product_image_id: row.side_product_image_id?.toString() ?? null,
    side_bg_image_id: row.side_bg_image_id?.toString() ?? null,
  };
}

/** GET full hero for dashboard editor. */
dashboardHomeHeroRouter.get("/", async (_req, res) => {
  const row = await ensureHomeHeroBanner();
  return res.json({ hero: toDashboardHero(row) });
});

/** PATCH text / CTA / discount fields. */
dashboardHomeHeroRouter.patch("/", async (req, res) => {
  const parsed = updateHomeHeroSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  const row = await prisma.homeHeroBanner.update({
    where: { id: 1 },
    data: {
      ...(data.main_eyebrow !== undefined
        ? { main_eyebrow: data.main_eyebrow }
        : {}),
      ...(data.main_headline !== undefined
        ? { main_headline: data.main_headline }
        : {}),
      ...(data.main_subtext !== undefined
        ? { main_subtext: data.main_subtext }
        : {}),
      ...(data.main_discount_percent !== undefined
        ? { main_discount_percent: data.main_discount_percent }
        : {}),
      ...(data.main_price_label !== undefined
        ? { main_price_label: data.main_price_label }
        : {}),
      ...(data.main_cta_label !== undefined
        ? { main_cta_label: data.main_cta_label }
        : {}),
      ...(data.main_cta_href !== undefined
        ? { main_cta_href: data.main_cta_href }
        : {}),
      ...(data.side_badge_label !== undefined
        ? { side_badge_label: data.side_badge_label }
        : {}),
      ...(data.side_offer_percent !== undefined
        ? { side_offer_percent: data.side_offer_percent }
        : {}),
      ...(data.side_offer_label !== undefined
        ? { side_offer_label: data.side_offer_label }
        : {}),
      ...(data.side_headline !== undefined
        ? { side_headline: data.side_headline }
        : {}),
      ...(data.side_discount_percent !== undefined
        ? { side_discount_percent: data.side_discount_percent }
        : {}),
      ...(data.side_cta_label !== undefined
        ? { side_cta_label: data.side_cta_label }
        : {}),
      ...(data.side_cta_href !== undefined
        ? { side_cta_href: data.side_cta_href }
        : {}),
    },
    include: HERO_MEDIA_INCLUDE,
  });

  return res.json({
    message: "Home hero saved",
    hero: toDashboardHero(row),
  });
});

function heroImageUploadMiddleware(label: string, codePrefix: string) {
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

/** Upload / replace a hero image slot — max 1 MB, resized. */
dashboardHomeHeroRouter.post(
  "/images/:slot",
  (req, res, next) => {
    const slotParsed = homeHeroImageSlotSchema.safeParse(req.params.slot);
    if (!slotParsed.success) {
      return res.status(400).json({
        message:
          "Invalid image slot (main_product|main_bg|side_product|side_bg)",
      });
    }
    const meta = SLOT_FIELD[slotParsed.data];
    return heroImageUploadMiddleware(meta.label, "HERO")(req, res, next);
  },
  async (req, res) => {
    const slot = homeHeroImageSlotSchema.parse(req.params.slot);
    const meta = SLOT_FIELD[slot];
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: `${meta.label} is required (field: image)`,
      });
    }

    const existing = await ensureHomeHeroBanner();
    const finalized = await finalizeCategoryImageUpload(
      file.path,
      file.mimetype,
    );
    if (!finalized.ok) {
      return res.status(400).json({
        message: finalized.message.replace(/^Category/i, meta.label),
        code: finalized.code?.replace(/^CATEGORY_/, "HERO_"),
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
          alt_text: meta.label.slice(0, 255),
          collection_name: "site_banners",
          is_public: true,
          mediable_type: "HomeHeroBanner",
          mediable_id: BigInt(1),
          sort_order: 0,
        },
      });

      const row = await prisma.homeHeroBanner.update({
        where: { id: 1 },
        data: { [meta.idField]: media.id },
        include: HERO_MEDIA_INCLUDE,
      });

      const previousMedia = existing[meta.relation];
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

      return res.json({
        message: `${meta.label} updated`,
        hero: toDashboardHero(row),
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
