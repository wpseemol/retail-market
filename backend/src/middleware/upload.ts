import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { randomUUID } from "node:crypto";
import {
  AVATAR_ALLOWED_MIMES,
  AVATAR_MAX_BYTES,
  type AvatarMime,
} from "../lib/avatarImage.js";

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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, USER_PHOTOS_DIR);
  },
  // Temp name — controller renames after magic-byte validation.
  filename: (_req, _file, cb) => {
    cb(null, `${randomUUID()}.upload`);
  },
});

export const avatarUpload = multer({
  storage,
  limits: {
    fileSize: AVATAR_MAX_BYTES,
    files: 1,
    fields: 5,
    parts: 6,
  },
  fileFilter: (_req, file, cb) => {
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
    if (
      ext &&
      ![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)
    ) {
      cb(new Error("Invalid image file extension"));
      return;
    }

    cb(null, true);
  },
});
