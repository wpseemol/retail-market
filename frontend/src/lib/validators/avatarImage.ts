/**
 * Client-side avatar checks (size + MIME + magic bytes).
 * Server still re-validates — never trust the browser alone.
 */

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const AVATAR_MIN_BYTES = 32;
export const AVATAR_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AvatarMime = (typeof AVATAR_ALLOWED_MIMES)[number];

function detectAvatarImageType(bytes: Uint8Array): AvatarMime | null {
  if (bytes.length < AVATAR_MIN_BYTES) return null;

  const head = new TextDecoder("utf-8", { fatal: false }).decode(
    bytes.subarray(0, Math.min(64, bytes.length)),
  );
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

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export type AvatarFileValidation =
  | { ok: true; mime: AvatarMime }
  | { ok: false; message: string };

/** Validate a profile photo before upload (size, allow-list MIME, magic bytes). */
export async function validateAvatarFile(
  file: File,
): Promise<AvatarFileValidation> {
  if (!file || !(file instanceof File)) {
    return { ok: false, message: "Please choose a profile image" };
  }

  if (file.size < AVATAR_MIN_BYTES) {
    return { ok: false, message: "Image file is empty or too small" };
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, message: "Image must be 5 MB or smaller" };
  }

  const declared = (file.type || "") as string;
  if (
    declared &&
    !AVATAR_ALLOWED_MIMES.includes(declared as AvatarMime)
  ) {
    return {
      ok: false,
      message: "Only JPEG, PNG, WebP, or GIF images are allowed",
    };
  }

  const name = file.name ?? "";
  if (/[<>]|<\?|javascript:|\.svg$/i.test(name)) {
    return { ok: false, message: "Invalid file name" };
  }

  const ext = name.includes(".")
    ? `.${name.split(".").pop()!.toLowerCase()}`
    : "";
  if (ext && ![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return { ok: false, message: "Invalid image file extension" };
  }

  // Sniff magic bytes — blocks renamed .exe / .html / .svg uploads.
  const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const detected = detectAvatarImageType(header);
  if (!detected) {
    return {
      ok: false,
      message: "File is not a valid JPEG, PNG, WebP, or GIF image",
    };
  }

  if (declared && detected !== declared) {
    return {
      ok: false,
      message: "File content does not match the selected image type",
    };
  }

  return { ok: true, mime: detected };
}
