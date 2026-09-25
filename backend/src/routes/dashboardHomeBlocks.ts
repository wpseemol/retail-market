import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  DEFAULT_HOME_BLOCKS,
  HOME_BLOCK_KEYS,
  type HomeBlockKey,
} from "../lib/homeBlocks.js";
import {
  finalizeCategoryImageUpload,
  CATEGORY_IMAGE_MAX_BYTES,
  PRODUCT_IMAGES_RELATIVE,
  sanitizeOriginalName,
} from "../lib/categoryImage.js";
import { PRODUCT_IMAGES_DIR } from "../lib/productImage.js";
import { toPublicMedia } from "../lib/user.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { categoryImageUpload } from "../middleware/upload.js";
import { homeBlockContentSchemas } from "../validators/homeBlocks.js";
import {
  ensureHomeBlocks,
  toPublicBlocks,
} from "./publicHomeBlocks.js";

export const dashboardHomeBlocksRouter = Router();

dashboardHomeBlocksRouter.use(requireAuth, requireRoles("super_admin"));

function isHomeBlockKey(key: string): key is HomeBlockKey {
  return (HOME_BLOCK_KEYS as readonly string[]).includes(key);
}

const patchBodySchema = z.object({
  content: z.record(z.string(), z.unknown()),
});

function validateBlockContent(
  key: HomeBlockKey,
  content: Record<string, unknown>,
):
  | { ok: true; content: Record<string, unknown> }
  | {
      ok: false;
      message: string;
      errors?: Record<string, string[] | undefined>;
    } {
  const schema =
    homeBlockContentSchemas[key as keyof typeof homeBlockContentSchemas] ??
    null;

  if (schema) {
    const parsed = schema.safeParse(content);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed",
        errors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[] | undefined
        >,
      };
    }
    return { ok: true, content: parsed.data as Record<string, unknown> };
  }

  return { ok: false, message: "Unknown home block key" };
}

dashboardHomeBlocksRouter.get("/", async (_req, res) => {
  const rows = await ensureHomeBlocks();
  return res.json({
    blocks: toPublicBlocks(rows),
    keys: [...HOME_BLOCK_KEYS],
  });
});

dashboardHomeBlocksRouter.get("/:key", async (req, res) => {
  const key = req.params.key;
  if (!isHomeBlockKey(key)) {
    return res.status(400).json({ message: "Unknown home block key" });
  }
  await ensureHomeBlocks();
  const row = await prisma.homeBlockContent.findUnique({ where: { key } });
  return res.json({
    key,
    content: row?.content ?? DEFAULT_HOME_BLOCKS[key],
    updated_at: row?.updated_at ?? null,
  });
});

dashboardHomeBlocksRouter.patch("/:key", async (req, res) => {
  const key = req.params.key;
  if (!isHomeBlockKey(key)) {
    return res.status(400).json({ message: "Unknown home block key" });
  }

  const parsed = patchBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const validated = validateBlockContent(key, parsed.data.content);
  if (!validated.ok) {
    return res.status(400).json({
      message: validated.message,
      ...(validated.errors ? { errors: validated.errors } : {}),
      code: validated.message.includes("not allowed")
        ? "UNSAFE_INPUT"
        : undefined,
    });
  }

  await ensureHomeBlocks();
  const row = await prisma.homeBlockContent.update({
    where: { key },
    data: { content: validated.content as Prisma.InputJsonValue },
  });

  return res.json({
    message: "Home block saved",
    key,
    content: row.content,
    updated_at: row.updated_at,
  });
});

dashboardHomeBlocksRouter.post("/:key/reset", async (req, res) => {
  const key = req.params.key;
  if (!isHomeBlockKey(key)) {
    return res.status(400).json({ message: "Unknown home block key" });
  }
  await ensureHomeBlocks();
  const row = await prisma.homeBlockContent.update({
    where: { key },
    data: { content: DEFAULT_HOME_BLOCKS[key] },
  });
  return res.json({
    message: "Home block reset to defaults",
    key,
    content: row.content,
    updated_at: row.updated_at,
  });
});

const imageFieldSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(
    /^[a-z][a-z0-9_]*(\.[a-z0-9_]+|\.\d+\.[a-z0-9_]+)*$/i,
    "Invalid image field path",
  );

function setByPath(
  target: Record<string, unknown>,
  fieldPath: string,
  value: string,
): boolean {
  const parts = fieldPath.split(".");
  let cursor: unknown = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const nextKey = parts[i + 1]!;
    if (/^\d+$/.test(key)) {
      const idx = Number(key);
      if (!Array.isArray(cursor)) return false;
      if (cursor[idx] == null || typeof cursor[idx] !== "object") {
        cursor[idx] = /^\d+$/.test(nextKey) ? [] : {};
      }
      cursor = cursor[idx];
    } else {
      if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) {
        return false;
      }
      const obj = cursor as Record<string, unknown>;
      if (obj[key] == null || typeof obj[key] !== "object") {
        obj[key] = /^\d+$/.test(nextKey) ? [] : {};
      }
      cursor = obj[key];
    }
  }
  const last = parts[parts.length - 1]!;
  if (Array.isArray(cursor) && /^\d+$/.test(last)) {
    cursor[Number(last)] = value;
    return true;
  }
  if (cursor && typeof cursor === "object" && !Array.isArray(cursor)) {
    (cursor as Record<string, unknown>)[last] = value;
    return true;
  }
  return false;
}

/** Upload image into a home-block JSON path — max 1 MB, always resized. */
dashboardHomeBlocksRouter.post(
  "/:key/images",
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
            ? `Image must be ${Math.floor(CATEGORY_IMAGE_MAX_BYTES / (1024 * 1024))} MB or smaller`
            : err instanceof Error
              ? err.message
              : "Upload failed",
          code: isTooLarge ? "HOME_IMAGE_TOO_LARGE" : undefined,
        });
      }
      return next();
    });
  },
  async (req, res) => {
    const key = req.params.key;
    if (!isHomeBlockKey(key)) {
      return res.status(400).json({ message: "Unknown home block key" });
    }

    const fieldParsed = imageFieldSchema.safeParse(
      req.query.field ?? req.body?.field,
    );
    if (!fieldParsed.success) {
      return res.status(400).json({
        message:
          "Image field path required (e.g. product_image or cards.0.image)",
      });
    }
    const fieldPath = fieldParsed.data;

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        message: "Image is required (multipart field: image)",
      });
    }

    const finalized = await finalizeCategoryImageUpload(
      file.path,
      file.mimetype,
    );
    if (!finalized.ok) {
      return res.status(400).json({
        message: finalized.message.replace(/^Category/i, "Home image"),
        code: finalized.code?.replace(/^CATEGORY_/, "HOME_"),
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
          alt_text: `${key}.${fieldPath}`.slice(0, 255),
          collection_name: "site_banners",
          is_public: true,
          mediable_type: "HomeBlockContent",
          mediable_id: BigInt(0),
          sort_order: 0,
        },
      });

      const publicMedia = toPublicMedia(media);
      const imageUrl = publicMedia?.path ?? "";

      await ensureHomeBlocks();
      const existing = await prisma.homeBlockContent.findUnique({
        where: { key },
      });
      const base =
        existing?.content &&
        typeof existing.content === "object" &&
        !Array.isArray(existing.content)
          ? structuredClone(existing.content as Record<string, unknown>)
          : structuredClone(
              DEFAULT_HOME_BLOCKS[key] as Record<string, unknown>,
            );

      if (!setByPath(base, fieldPath, imageUrl)) {
        try {
          fs.unlinkSync(path.join(PRODUCT_IMAGES_DIR, finalized.fileName));
        } catch {
          /* ignore */
        }
        await prisma.media
          .delete({ where: { id: media.id } })
          .catch(() => undefined);
        return res
          .status(400)
          .json({ message: "Could not set image field path" });
      }

      const validated = validateBlockContent(key, base);
      const toSave = validated.ok ? validated.content : base;

      const row = await prisma.homeBlockContent.update({
        where: { key },
        data: { content: toSave as Prisma.InputJsonValue },
      });

      return res.json({
        message: "Image updated",
        key,
        field: fieldPath,
        path: imageUrl,
        content: row.content,
        updated_at: row.updated_at,
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
