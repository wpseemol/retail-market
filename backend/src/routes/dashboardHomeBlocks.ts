import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  DEFAULT_HOME_BLOCKS,
  HOME_BLOCK_KEYS,
  type HomeBlockKey,
} from "../lib/homeBlocks.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { findUnsafeInputReason } from "../validators/customerAuth.js";
import {
  ensureHomeBlocks,
  toPublicBlocks,
} from "./publicHomeBlocks.js";

export const dashboardHomeBlocksRouter = Router();

dashboardHomeBlocksRouter.use(requireAuth, requireRoles("super_admin"));

function isHomeBlockKey(key: string): key is HomeBlockKey {
  return (HOME_BLOCK_KEYS as readonly string[]).includes(key);
}

/** Recursively reject unsafe strings inside JSON content. */
function assertSafeJson(value: unknown, path = "content"): string | null {
  if (typeof value === "string") {
    return findUnsafeInputReason(value);
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const err = assertSafeJson(value[i], `${path}[${i}]`);
      if (err) return err;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const keyReason = findUnsafeInputReason(k);
      if (keyReason) return keyReason;
      const err = assertSafeJson(v, `${path}.${k}`);
      if (err) return err;
    }
  }
  return null;
}

const patchBodySchema = z.object({
  content: z.record(z.string(), z.unknown()),
});

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

  const unsafe = assertSafeJson(parsed.data.content);
  if (unsafe) {
    return res.status(400).json({ message: unsafe, code: "UNSAFE_INPUT" });
  }

  await ensureHomeBlocks();
  const row = await prisma.homeBlockContent.update({
    where: { key },
    data: { content: parsed.data.content as Prisma.InputJsonValue },
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
