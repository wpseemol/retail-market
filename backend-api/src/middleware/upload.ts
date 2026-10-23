import fs from "node:fs";
import path from "node:path";
import type { Request } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { storageConfig } from "../config/storage.config.js";
import { ensureLocalUploadDir } from "../lib/storage/files.js";
import {
  AVATAR_ALLOWED_MIMES,
  AVATAR_MAX_BYTES,
  type AvatarMime,
} from "../lib/avatarImage.js";
import { CATEGORY_IMAGE_MAX_BYTES } from "../lib/categoryImage.js";
import {
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGES_DIR,
} from "../lib/productImage.js";
import { SHOP_IMAGES_DIR } from "../lib/shopImage.js";
import {
  REVIEW_IMAGE_MAX_BYTES,
  REVIEW_IMAGE_MAX_FILES,
  REVIEW_IMAGES_DIR,
} from "../lib/reviewImage.js";

/** Disk folder for all customer profile photos. */
export const USER_PHOTOS_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "users",
  "photos",
);

/** Relative path stored on `medias.file_path`. */
export const USER_PHOTOS_RELATIVE = "users/photos";

ensureLocalUploadDir(USER_PHOTOS_DIR);
ensureLocalUploadDir(PRODUCT_IMAGES_DIR);
ensureLocalUploadDir(SHOP_IMAGES_DIR);

/** Bytes for an image upload. S3 mode keeps them in memory so nothing is written under `uploads/`. */
export function uploadBytes(file: Express.Multer.File): Buffer | string {
  if (file.buffer && file.buffer.byteLength > 0) return file.buffer;
  return file.path;
}

/** Removes a multer temp file. Memory uploads have no path. */
export function discardTempUpload(file: Express.Multer.File | undefined): void {
  if (!file?.path) return;
  try {
    fs.unlinkSync(file.path);
  } catch {
    /* ignore */
  }
}

function imageStorage(dir: string): multer.StorageEngine {
  if (storageConfig.driver === "s3") return multer.memoryStorage();
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, dir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `${randomUUID()}.upload`);
    },
  });
}

function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (!AVATAR_ALLOWED_MIMES.includes(file.mimetype as AvatarMime)) {
    cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
    return;
  }

  const name = file.originalname ?? "";
  if (name.length > 255 || /[<>]|<\?|javascript:|\.svg$/i.test(name)) {
    cb(new Error("Invalid file name"));
    return;
  }

  const ext = path.extname(name).toLowerCase();
  if (ext && ![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    cb(new Error("Invalid image file extension"));
    return;
  }

  cb(null, true);
}

export const avatarUpload = multer({
  storage: imageStorage(USER_PHOTOS_DIR),
  limits: {
    fileSize: AVATAR_MAX_BYTES,
    files: 1,
    fields: 5,
    parts: 6,
  },
  fileFilter: imageFileFilter,
});

/** Product / variant images → `medias` · max 5 MB · resized, then stored on the active driver. */
export const productImageUpload = multer({
  storage: imageStorage(PRODUCT_IMAGES_DIR),
  limits: {
    fileSize: PRODUCT_IMAGE_MAX_BYTES,
    files: 12,
    fields: 20,
    parts: 32,
  },
  fileFilter: imageFileFilter,
});

/** Category cover images — max 1 MB (resized server-side). */
export const categoryImageUpload = multer({
  storage: imageStorage(PRODUCT_IMAGES_DIR),
  limits: {
    fileSize: CATEGORY_IMAGE_MAX_BYTES,
    files: 1,
    fields: 8,
    parts: 10,
  },
  fileFilter: imageFileFilter,
});

/** Brand logo images — same limits as category cover (1 MB, resized). */
export const brandImageUpload = categoryImageUpload;

/** Shop logo / store image → `medias`. */
export const shopImageUpload = multer({
  storage: imageStorage(SHOP_IMAGES_DIR),
  limits: {
    fileSize: AVATAR_MAX_BYTES,
    files: 1,
    fields: 8,
    parts: 10,
  },
  fileFilter: imageFileFilter,
});

/** Customer review photos → `medias` · max 4 × 2 MB · resized. */
export const reviewImageUpload = multer({
  storage: imageStorage(REVIEW_IMAGES_DIR),
  limits: {
    fileSize: REVIEW_IMAGE_MAX_BYTES,
    files: REVIEW_IMAGE_MAX_FILES,
    fields: 10,
    parts: 14,
  },
  fileFilter: imageFileFilter,
});
