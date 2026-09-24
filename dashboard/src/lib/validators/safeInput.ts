import { z } from "zod";

const HTML_TAG_RE = /<\s*\/?\s*[a-zA-Z!][^>]*>/;
const SCRIPT_TAG_RE = /<\s*\/?\s*script\b/i;
const PHP_TAG_RE = /<\?(?:php|=)?|\?>/i;
const JS_PROTOCOL_RE = /javascript\s*:/i;
const EVENT_HANDLER_RE = /\bon[a-z]+\s*=/i;
const JS_CODE_RE =
  /(\beval\s*\()|(\bFunction\s*\()|(\bnew\s+Function\b)|(\bimport\s*\()|(\brequire\s*\()|(\bdocument\.(cookie|write|location)\b)|(\bwindow\.(location|eval)\b)|(\batob\s*\()|(\bfromCharCode\b)/i;
const PHP_CODE_RE =
  /(\bbase64_decode\s*\()|(\bsystem\s*\()|(\bshell_exec\s*\()|(\bpassthru\s*\()|(\bexec\s*\()|(\bpreg_replace\s*\([^)]*\/e)/i;
const SQL_INJECTION_RE =
  /(\bunion\s+select\b)|(\bselect\b.+\bfrom\b)|(\binsert\s+into\b)|(\bdelete\s+from\b)|(\bdrop\s+(table|database)\b)|(\balter\s+table\b)|(\btruncate\s+table\b)|(\b(exec|execute)\s*\()|(\bxp_\w+\b)|(\b(or|and)\b\s+\d+\s*=\s*\d+)|(;\s*(select|insert|update|delete|drop|alter|truncate)\b)|(\/\*|\*\/)|(--\s+)/i;

/** Reject SQL / PHP / JS / HTML injection payloads in any user string. */
export function findUnsafeInputReason(value: string): string | null {
  if (SCRIPT_TAG_RE.test(value)) return "Script tags are not allowed";
  if (PHP_TAG_RE.test(value) || PHP_CODE_RE.test(value)) {
    return "PHP code is not allowed";
  }
  if (JS_CODE_RE.test(value)) return "JavaScript code is not allowed";
  if (
    HTML_TAG_RE.test(value) ||
    JS_PROTOCOL_RE.test(value) ||
    EVENT_HANDLER_RE.test(value)
  ) {
    return "HTML tags and event handlers are not allowed";
  }
  if (SQL_INJECTION_RE.test(value)) {
    return "SQL-like patterns are not allowed";
  }
  return null;
}

/** Zod helper: apply injection guards to string fields. */
export function withSafeInput<T extends z.ZodType<string>>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Validation failed";
}

/** Shared image upload policy helpers for UI pre-checks. */
export const SAFE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function validateSafeImageFile(
  file: File | null | undefined,
  maxBytes: number,
  label = "Image",
): { ok: true } | { ok: false; message: string } {
  if (!file) return { ok: true };

  if (!(SAFE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      message: "Only JPEG, PNG, WebP, or GIF images are allowed",
    };
  }

  if (file.size > maxBytes) {
    const mb = Math.max(1, Math.floor(maxBytes / (1024 * 1024)));
    return { ok: false, message: `${label} must be ${mb} MB or smaller` };
  }

  const name = file.name ?? "";
  if (
    name.length > 255 ||
    /[<>]|<\?|javascript:|\.svg$/i.test(name) ||
    /\.(php|js|mjs|cjs|html|htm|exe|sh|bat|asp|aspx|jsp)$/i.test(name)
  ) {
    return { ok: false, message: "Invalid image file name" };
  }

  return { ok: true };
}
