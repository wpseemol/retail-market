/**
 * Client-side checks for the header "search by image" picker.
 * The file stays in the browser — it is not uploaded.
 */

export const SEARCH_IMAGE_MAX_BYTES = 1 * 1024 * 1024;
const SEARCH_IMAGE_MIN_BYTES = 32;

const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type AllowedMime = (typeof ALLOWED_MIMES)[number];

export type SearchImageCode =
  | "empty"
  | "too-small"
  | "too-large"
  | "type"
  | "name"
  | "extension"
  | "magic"
  | "mismatch";

export type SearchImageValidation =
  | { ok: true; mime: AllowedMime }
  | { ok: false; code: SearchImageCode };

function detectImageType(bytes: Uint8Array): AllowedMime | null {
  if (bytes.length < SEARCH_IMAGE_MIN_BYTES) return null;

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
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Camera names such as IMG_2048 are not product searches. */
export function queryFromImageFileName(name: string): string | null {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (/^(img|image|photo|dsc|pict?)\s*\d*$/i.test(base)) return null;
  return base;
}

export async function validateSearchImage(
  file: File | undefined,
): Promise<SearchImageValidation> {
  if (!file || !(file instanceof File)) return { ok: false, code: "empty" };
  if (file.size < SEARCH_IMAGE_MIN_BYTES) return { ok: false, code: "too-small" };
  if (file.size > SEARCH_IMAGE_MAX_BYTES) return { ok: false, code: "too-large" };

  const declared = file.type || "";
  if (declared && !ALLOWED_MIMES.includes(declared as AllowedMime)) {
    return { ok: false, code: "type" };
  }

  const name = file.name ?? "";
  if (/[<>]|<\?|javascript:|\.svg$/i.test(name)) {
    return { ok: false, code: "name" };
  }

  const ext = name.includes(".")
    ? `.${name.split(".").pop()!.toLowerCase()}`
    : "";
  if (ext && ![".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return { ok: false, code: "extension" };
  }

  const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const detected = detectImageType(header);
  if (!detected) return { ok: false, code: "magic" };
  if (declared && detected !== declared) return { ok: false, code: "mismatch" };
  return { ok: true, mime: detected };
}
