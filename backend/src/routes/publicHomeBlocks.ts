import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  DEFAULT_HOME_BLOCKS,
  HOME_BLOCK_KEYS,
  type HomeBlockKey,
} from "../lib/homeBlocks.js";
import {
  ensureHomeHeroBanner,
  toPublicHomeHero,
} from "./publicHome.js";

export const publicHomeBlocksRouter = Router();

function isHomeBlockKey(key: string): key is HomeBlockKey {
  return (HOME_BLOCK_KEYS as readonly string[]).includes(key);
}

export async function ensureHomeBlocks() {
  const existing = await prisma.homeBlockContent.findMany();
  const byKey = new Map(existing.map((r) => [r.key, r]));
  const missing = HOME_BLOCK_KEYS.filter((k) => !byKey.has(k));

  if (missing.length > 0) {
    await prisma.homeBlockContent.createMany({
      data: missing.map((key) => ({
        key,
        content: DEFAULT_HOME_BLOCKS[key],
      })),
    });
  }

  const rows = await prisma.homeBlockContent.findMany({
    orderBy: { key: "asc" },
  });
  return rows;
}

export function toPublicBlocks(
  rows: Awaited<ReturnType<typeof ensureHomeBlocks>>,
) {
  const blocks: Record<string, unknown> = {};
  for (const row of rows) {
    blocks[row.key] =
      row.content ??
      (isHomeBlockKey(row.key) ? DEFAULT_HOME_BLOCKS[row.key] : {});
  }
  for (const key of HOME_BLOCK_KEYS) {
    if (!(key in blocks)) blocks[key] = DEFAULT_HOME_BLOCKS[key];
  }
  return blocks;
}

/** All home CMS blocks + hero — one round-trip for storefront SSR. */
publicHomeBlocksRouter.get("/blocks", async (_req, res) => {
  const [rows, hero] = await Promise.all([
    ensureHomeBlocks(),
    ensureHomeHeroBanner(),
  ]);
  return res.json({
    blocks: toPublicBlocks(rows),
    hero: toPublicHomeHero(hero),
  });
});
