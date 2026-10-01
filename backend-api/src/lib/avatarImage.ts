import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/** Shared avatar upload policy (enforced on multer + controller). */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const AVATAR_MIN_BYTES = 32; // reject empty / tiny stubs
export const AVATAR_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AvatarMime = (typeof AVATAR_ALLOWED_MIMES)[number];

export type DetectedAvatarImage = {
  mime: AvatarMime;
  ext: ".jpg" | ".png" | ".webp" | ".gif";
};

/**
 * Detect real image type from magic bytes — never trust client Content-Type alone.
 * Rejects SVG/HTML/PHP polyglots and non-image binaries.
 */
export function detectAvatarImageType(
  buffer: Buffer,
): DetectedAvatarImage | null {
  if (buffer.length < AVATAR_MIN_BYTES) return null;

  // Block text/markup polyglots early (SVG, HTML, PHP).
  const head = buffer.subarray(0, Math.min(64, buffer.length)).toString("utf8");
  if (
    /^\s*<\?php/i.test(head) ||
    /^\s*<\?=/i.test(head) ||
    /^\s*<!DOCTYPE\s+html/i.test(head) ||
    /^\s*<html[\s>]/i.test(head) ||
    /^\s*<svg[\s>]/i.test(head) ||
    /^\s*<\?xml[\s\S]*<svg/i.test(head)
  ) {
    return null;
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: ".jpg" };
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", ext: ".png" };
  }

  // GIF87a / GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { mime: "image/gif", ext: ".gif" };
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: "image/webp", ext: ".webp" };
  }

  return null;
}

export type AvatarValidationOk = {
  ok: true;
  detected: DetectedAvatarImage;
  size: number;
};

export type AvatarValidationErr = {
  ok: false;
  message: string;
  code: string;
};

export function validateAvatarBuffer(
  buffer: Buffer,
  declaredMime?: string | null,
): AvatarValidationOk | AvatarValidationErr {
  const size = buffer.length;

  if (size < AVATAR_MIN_BYTES) {
    return {
      ok: false,
      message: "Image file is empty or too small",
      code: "AVATAR_TOO_SMALL",
    };
  }

  if (size > AVATAR_MAX_BYTES) {
    return {
      ok: false,
      message: "Image must be 5 MB or smaller",
      code: "AVATAR_TOO_LARGE",
    };
  }

  const detected = detectAvatarImageType(buffer);
  if (!detected) {
    return {
      ok: false,
      message: "Only JPEG, PNG, WebP, or GIF images are allowed",
      code: "AVATAR_INVALID_TYPE",
    };
  }

  // If client sent a MIME, it must match sniffed type (when it claims to be an image).
  if (
    declaredMime &&
    declaredMime.length > 0 &&
    AVATAR_ALLOWED_MIMES.includes(declaredMime as AvatarMime) &&
    declaredMime !== detected.mime
  ) {
    return {
      ok: false,
      message: "File content does not match the declared image type",
      code: "AVATAR_MIME_MISMATCH",
    };
  }

  // Reject declared non-image MIME even if somehow the filter was bypassed.
  if (
    declaredMime &&
    declaredMime.length > 0 &&
    !AVATAR_ALLOWED_MIMES.includes(declaredMime as AvatarMime)
  ) {
    return {
      ok: false,
      message: "Only JPEG, PNG, WebP, or GIF images are allowed",
      code: "AVATAR_INVALID_TYPE",
    };
  }

  return { ok: true, detected, size };
}

/** Sanitize original filename for DB storage only (never used as disk path). */
export function sanitizeOriginalName(name: string | undefined): string | null {
  if (!name) return null;
  const base = path.basename(name).replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 200);
  if (!base || /[<>]|<\?|javascript:/i.test(base)) return null;
  return base;
}

export type FinalizedAvatarOk = {
  ok: true;
  detected: DetectedAvatarImage;
  size: number;
  fileName: string;
  absolutePath: string;
};

export type FinalizedAvatarResult = FinalizedAvatarOk | AvatarValidationErr;

/**
 * After multer writes a temp file: sniff bytes, rename to UUID+real ext, or delete + error.
 */
export function finalizeAvatarUpload(
  tempPath: string,
  declaredMime?: string | null,
): FinalizedAvatarResult {
  const buffer = fs.readFileSync(tempPath);
  const validated = validateAvatarBuffer(buffer, declaredMime);

  if (!validated.ok) {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
    return validated;
  }

  const finalName = `${randomUUID()}${validated.detected.ext}`;
  const finalPath = path.join(path.dirname(tempPath), finalName);

  try {
    fs.renameSync(tempPath, finalPath);
  } catch {
    try {
      fs.writeFileSync(finalPath, buffer);
      fs.unlinkSync(tempPath);
    } catch {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        message: "Failed to store image",
        code: "AVATAR_STORE_FAILED",
      };
    }
  }

  return {
    ok: true,
    detected: validated.detected,
    size: validated.size,
    fileName: finalName,
    absolutePath: finalPath,
  };
}
