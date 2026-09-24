import fs from "node:fs";
import path from "node:path";
import type { Request } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import {
  AVATAR_ALLOWED_MIMES,
  AVATAR_MAX_BYTES,
  type AvatarMime,
} from "../lib/avatarImage.js";
import { CATEGORY_IMAGE_MAX_BYTES } from "../lib/categoryImage.js";
import { PRODUCT_IMAGES_DIR } from "../lib/productImage.js";
import { SHOP_IMAGES_DIR } from "../lib/shopImage.js";

/** Disk folder for all customer profile photos. */
export const USER_PHOTOS_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "users",
  "photos",
);

/** Relative path stored on `medias.file_path`. */
export const USER_PHOTOS_RELATIVE = "users/photos";

fs.mkdirSync(USER_PHOTOS_DIR, { recursive: true });
fs.mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true });
fs.mkdirSync(SHOP_IMAGES_DIR, { recursive: true });

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

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, USER_PHOTOS_DIR);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${randomUUID()}.upload`);
  },
});

export const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: AVATAR_MAX_BYTES,
    files: 1,
    fields: 5,
    parts: 6,
  },
  fileFilter: imageFileFilter,
});

const productImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PRODUCT_IMAGES_DIR);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${randomUUID()}.upload`);
  },
});

/** Product / variant images → `uploads/products/` + `medias`. */
export const productImageUpload = multer({
  storage: productImageStorage,
  limits: {
    fileSize: AVATAR_MAX_BYTES,
    files: 12,
    fields: 20,
    parts: 32,
  },
  fileFilter: imageFileFilter,
});

/** Category cover images — max 1 MB (resized server-side). */
export const categoryImageUpload = multer({
  storage: productImageStorage,
  limits: {
    fileSize: CATEGORY_IMAGE_MAX_BYTES,
    files: 1,
    fields: 8,
    parts: 10,
  },
  fileFilter: imageFileFilter,
});

const shopImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, SHOP_IMAGES_DIR);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${randomUUID()}.upload`);
  },
});

/** Shop logo / store image → `uploads/shops/` + `medias`. */
export const shopImageUpload = multer({
  storage: shopImageStorage,
  limits: {
    fileSize: AVATAR_MAX_BYTES,
    files: 1,
    fields: 8,
    parts: 10,
  },
  fileFilter: imageFileFilter,
});
