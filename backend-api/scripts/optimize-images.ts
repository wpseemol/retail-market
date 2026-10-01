/**
 * One-off / repeatable: re-optimizes images uploaded before the resize pipeline existed.
 *
 *   npm run images:optimize -- --dry-run        # report only
 *   npm run images:optimize                     # resize to the upload preset, re-encode WebP (favicon PNG)
 *   npm run images:optimize -- --prune-orphans  # also delete files no media row points to
 *
 * Each `medias` row gets a new UUID file name so CDN/browser caches never serve a stale file.
 * The original file is kept: cached pages (Next.js revalidates every 60 s, CDNs longer) still
 * link to it. Once those caches have expired, run again with `--prune-orphans` to delete it.
 * Home-block images are stored as URLs inside `home_block_contents.content`, so those URLs are
 * rewritten too. Trade licenses (documents) and already-optimized files are left alone.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";
import {
  homeBlockImagePreset,
  IMAGE_PRESETS,
  optimizeImage,
  type ImagePresetKey,
} from "../src/lib/imageOptimize.js";

const dryRun = process.argv.includes("--dry-run");
const pruneOrphans = process.argv.includes("--prune-orphans");
const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");

const mediaInclude = {
  _count: {
    select: {
      avatarForUsers: true,
      categoryImages: true,
      brandImages: true,
      siteSettingsOg: true,
      siteSettingsFavicon: true,
      siteSettingsLogin: true,
      homeHeroMainProduct: true,
      homeHeroMainBg: true,
      homeHeroSideProduct: true,
      homeHeroSideBg: true,
      productThumbnails: true,
      variantImages: true,
      vendorLogos: true,
      vendorBanners: true,
    },
  },
} satisfies Prisma.MediaInclude;

type MediaRow = Prisma.MediaGetPayload<{ include: typeof mediaInclude }>;

function presetFor(media: MediaRow): ImagePresetKey | null {
  const c = media._count;
  if (media.collection_name === "trade_licenses") return null;
  if (c.siteSettingsFavicon) return "favicon";
  if (c.siteSettingsOg) return "ogImage";
  if (c.siteSettingsLogin) return "loginLogo";
  if (c.homeHeroMainBg) return "heroMainBg";
  if (c.homeHeroMainProduct) return "heroMainProduct";
  if (c.homeHeroSideBg) return "heroSideBg";
  if (c.homeHeroSideProduct) return "heroSideProduct";
  if (c.vendorBanners) return "shopBanner";
  if (c.vendorLogos) return "shopLogo";
  if (c.categoryImages) return "category";
  if (c.brandImages) return "brand";
  if (c.avatarForUsers) return "avatar";
  if (c.productThumbnails || c.variantImages) return "product";

  switch (media.mediable_type) {
    case "HomeBlockContent": {
      const [key, ...field] = (media.alt_text ?? "").split(".");
      return homeBlockImagePreset(key ?? "", field.join(".") || "image");
    }
    case "Product":
      return "product";
    case "Category":
      return "category";
    case "Brand":
      return "brand";
    case "User":
      return "avatar";
  }
  switch (media.collection_name) {
    case "product_images":
      return "product";
    case "avatars":
      return "avatar";
    case "vendor_banners":
      return "shopBanner";
    default:
      return "homeGeneric";
  }
}

function publicUrl(filePath: string, fileName: string) {
  return `/uploads/${filePath.replace(/^\/+|\/+$/g, "")}/${fileName}`;
}

async function rewriteHomeBlockUrls(oldUrl: string, newUrl: string) {
  const blocks = await prisma.homeBlockContent.findMany();
  for (const block of blocks) {
    const raw = JSON.stringify(block.content);
    if (!raw.includes(oldUrl)) continue;
    await prisma.homeBlockContent.update({
      where: { id: block.id },
      data: { content: JSON.parse(raw.split(oldUrl).join(newUrl)) as Prisma.InputJsonValue },
    });
  }
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

async function main() {
  const rows = await prisma.media.findMany({
    where: { disk: "public" },
    include: mediaInclude,
    orderBy: { id: "asc" },
  });

  let before = 0;
  let after = 0;
  let changed = 0;
  let skipped = 0;
  let missing = 0;
  const referenced = new Set<string>();

  for (const media of rows) {
    const dir = path.join(UPLOADS_ROOT, media.file_path);
    const absolute = path.join(dir, media.file_name);
    referenced.add(path.normalize(absolute));
    const preset = presetFor(media);
    const label = `#${media.id} ${media.file_path}/${media.file_name}`;

    if (!preset) {
      skipped++;
      continue;
    }
    if (!fs.existsSync(absolute)) {
      missing++;
      console.warn(`  missing  ${label}`);
      continue;
    }

    const input = fs.readFileSync(absolute);
    let meta: sharp.Metadata;
    try {
      meta = await sharp(input).metadata();
    } catch {
      console.warn(`  unreadable ${label}`);
      skipped++;
      continue;
    }

    const box = IMAGE_PRESETS[preset];
    const targetMime = box.format === "png" ? "image/png" : "image/webp";
    const fitsBox = (meta.width ?? 0) <= box.width && (meta.height ?? 0) <= box.height;
    const rightFormat = media.mime_type === targetMime;
    if (fitsBox && rightFormat) {
      skipped++;
      continue;
    }

    const optimized = await optimizeImage(input, preset);
    if (fitsBox && optimized.output.length >= input.length) {
      skipped++;
      continue;
    }
    const outMeta = await sharp(optimized.output).metadata();

    before += input.length;
    after += optimized.output.length;
    changed++;
    console.log(
      `  ${dryRun ? "would optimize" : "optimized"} ${label} [${preset}] ` +
        `${meta.width}×${meta.height} ${kb(input.length)} → ${outMeta.width}×${outMeta.height} ${kb(optimized.output.length)}`,
    );
    if (dryRun) continue;

    const newName = `${randomUUID()}${optimized.ext}`;
    fs.writeFileSync(path.join(dir, newName), optimized.output);
    await prisma.media.update({
      where: { id: media.id },
      data: {
        file_name: newName,
        file_size: BigInt(optimized.output.length),
        mime_type: optimized.mime,
        dimensions: { width: outMeta.width ?? null, height: outMeta.height ?? null },
      },
    });
    if (media.mediable_type === "HomeBlockContent") {
      await rewriteHomeBlockUrls(
        publicUrl(media.file_path, media.file_name),
        publicUrl(media.file_path, newName),
      );
    }
    referenced.delete(path.normalize(absolute));
    referenced.add(path.normalize(path.join(dir, newName)));
  }

  const orphans: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (!entry.name.startsWith(".") && !referenced.has(path.normalize(full))) orphans.push(full);
    }
  };
  walk(UPLOADS_ROOT);

  console.log(
    `\n${dryRun ? "Dry run: " : ""}${changed} optimized, ${skipped} skipped, ${missing} missing file(s).`,
  );
  if (changed > 0) {
    const saved = before - after;
    console.log(
      `Size: ${kb(before)} → ${kb(after)} (saved ${kb(saved)}, ${Math.round((saved / before) * 100)}%).`,
    );
  }
  if (orphans.length > 0) {
    const bytes = orphans.reduce((sum, file) => sum + fs.statSync(file).size, 0);
    if (pruneOrphans && !dryRun) {
      for (const file of orphans) fs.unlinkSync(file);
      console.log(`\nDeleted ${orphans.length} unreferenced file(s) (${kb(bytes)}).`);
    } else {
      console.log(
        `\n${orphans.length} unreferenced file(s) in uploads/ (${kb(bytes)}), e.g. originals replaced ` +
          `above. Delete them with --prune-orphans once page/CDN caches have expired.`,
      );
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
