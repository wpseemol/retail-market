import type { NextFunction, Request, Response } from "express";
import type { Media } from "@prisma/client";
import type multer from "multer";
import { currentMediaDisk } from "../config/storage.config.js";
import { deleteMediaFile } from "./storage/files.js";
import { discardTempUpload, uploadBytes } from "../middleware/upload.js";
import {
  CATEGORY_IMAGE_MAX_BYTES,
  finalizeCategoryImageUpload,
  PRODUCT_IMAGES_RELATIVE,
  sanitizeOriginalName,
} from "./categoryImage.js";
import { prisma } from "./prisma.js";
import { finalizeShopImageUpload, SHOP_IMAGES_RELATIVE } from "./shopImage.js";

/** Runs a single-file multer upload and turns its errors into `400 { message, code }`. */
export function singleImageUpload(
  upload: multer.Multer,
  field: string,
  label: string,
  maxBytes: number,
  codePrefix: string,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();
      const isTooLarge =
        err instanceof Error &&
        ("code" in err
          ? (err as { code?: string }).code === "LIMIT_FILE_SIZE"
          : /file too large/i.test(err.message));
      return res.status(400).json({
        message: isTooLarge
          ? `${label} must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller`
          : err instanceof Error
            ? err.message
            : "Upload failed",
        code: isTooLarge ? `${codePrefix}_TOO_LARGE` : undefined,
      });
    });
  };
}

export function discardUpload(file: Express.Multer.File | undefined) {
  discardTempUpload(file);
}

/** Deletes a media row and its object (S3) or file under `uploads/`. */
export async function removeStoredMedia(media: Pick<Media, "id" | "file_name" | "file_path"> | null | undefined) {
  if (!media) return;
  await deleteMediaFile(media.file_path, media.file_name);
  await prisma.media.delete({ where: { id: media.id } }).catch(() => undefined);
}

export type ShowcaseImageKind = "og" | "brandBanner";

/** Max upload size per kind (multer and after resize). */
export const SHOWCASE_IMAGE_MAX_BYTES: Record<ShowcaseImageKind, number> = {
  og: CATEGORY_IMAGE_MAX_BYTES,
  brandBanner: 5 * 1024 * 1024,
};

/**
 * Validates magic bytes, resizes (`ogImage` 1200×630 or `brandBanner` 1920×640),
 * re-checks size and stores a `medias` row.
 */
export async function storeShowcaseImage(input: {
  file: Express.Multer.File;
  kind: ShowcaseImageKind;
  actorId: bigint;
  altText: string;
  mediableType: "Vendor" | "Brand";
  mediableId: bigint;
}): Promise<{ ok: true; media: Media } | { ok: false; message: string; code?: string }> {
  const { file, kind } = input;
  const finalized =
    kind === "og"
      ? await finalizeCategoryImageUpload(uploadBytes(file), file.mimetype, "ogImage")
      : await finalizeShopImageUpload(uploadBytes(file), file.mimetype, "brandBanner");
  if (!finalized.ok) {
    const label = kind === "og" ? "Share image" : "Banner";
    return {
      ok: false,
      message: finalized.message.replace(/^(Category image|Image)/i, label),
      code: finalized.code?.replace(/^(CATEGORY_IMAGE|AVATAR|IMAGE)_/, kind === "og" ? "OG_IMAGE_" : "BANNER_"),
    };
  }

  try {
    const media = await prisma.media.create({
      data: {
        user_id: input.actorId,
        disk: currentMediaDisk(),
        file_name: finalized.fileName,
        original_name: sanitizeOriginalName(file.originalname),
        file_path: kind === "og" ? PRODUCT_IMAGES_RELATIVE : SHOP_IMAGES_RELATIVE,
        file_size: BigInt(finalized.size),
        mime_type: finalized.detected.mime,
        alt_text: input.altText.slice(0, 255),
        collection_name: kind === "og" ? "showcase_og" : "brand_banners",
        is_public: true,
        mediable_type: input.mediableType,
        mediable_id: input.mediableId,
        sort_order: 0,
      },
    });
    return { ok: true, media };
  } catch (err) {
    await deleteMediaFile(
      kind === "og" ? PRODUCT_IMAGES_RELATIVE : SHOP_IMAGES_RELATIVE,
      finalized.fileName,
    );
    throw err;
  }
}
