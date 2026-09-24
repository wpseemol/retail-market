import { z } from "zod";
import { CATEGORY_ICON_NAMES } from "@/lib/icons";

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

function withSafeInput<T extends z.ZodType<string>>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

export const CATEGORY_IMAGE_MAX_BYTES = 1 * 1024 * 1024;
export const CATEGORY_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const iconSchema = z.enum(CATEGORY_ICON_NAMES, {
  message: "Select an icon from the library",
});

export const categoryFormSchema = z.object({
  name: withSafeInput(z.string().trim().min(2, "Name must be at least 2 characters").max(150)),
  slug: withSafeInput(
    z
      .string()
      .trim()
      .min(2, "Slug must be at least 2 characters")
      .max(160)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase letters, numbers, and hyphens",
      ),
  ),
  description: z
    .union([withSafeInput(z.string().trim().max(5000)), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  icon: z.union([iconSchema, z.null()]).optional(),
  parent_id: z
    .union([z.string().regex(/^\d+$/), z.literal(""), z.null()])
    .transform((v) => (v === "" || v == null ? null : v))
    .optional(),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(999_999),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export function validateCategoryForm(input: unknown) {
  return categoryFormSchema.safeParse(input);
}

export function validateCategoryImageFile(
  file: File | null | undefined,
): { ok: true } | { ok: false; message: string } {
  if (!file) return { ok: true };

  if (
    !(CATEGORY_IMAGE_ALLOWED_TYPES as readonly string[]).includes(file.type)
  ) {
    return {
      ok: false,
      message: "Only JPEG, PNG, WebP, or GIF images are allowed",
    };
  }

  if (file.size > CATEGORY_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      message: "Category image must be 1 MB or smaller",
    };
  }

  const name = file.name ?? "";
  if (
    name.length > 255 ||
    /[<>]|<\?|javascript:|\.svg$/i.test(name) ||
    /\.(php|js|mjs|cjs|html|htm|exe|sh|bat)$/i.test(name)
  ) {
    return { ok: false, message: "Invalid image file name" };
  }

  return { ok: true };
}

export function firstZodError(
  result: { success: false; error: z.ZodError },
): string {
  return result.error.issues[0]?.message ?? "Validation failed";
}
