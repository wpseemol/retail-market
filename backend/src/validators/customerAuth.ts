import { z } from "zod";

const HTML_TAG_RE = /<\s*\/?\s*[a-zA-Z!][^>]*>/;
const SCRIPT_TAG_RE = /<\s*\/?\s*script\b/i;
const PHP_TAG_RE = /<\?(?:php|=)?|\?>/i;
const JS_PROTOCOL_RE = /javascript\s*:/i;
const EVENT_HANDLER_RE = /\bon[a-z]+\s*=/i;

/** Compound SQL payloads — avoids blocking normal passwords that contain `'`, `"`, or `;`. */
const SQL_INJECTION_RE =
  /(\bunion\s+select\b)|(\bselect\b.+\bfrom\b)|(\binsert\s+into\b)|(\bdelete\s+from\b)|(\bdrop\s+(table|database)\b)|(\balter\s+table\b)|(\btruncate\s+table\b)|(\b(exec|execute)\s*\()|(\bxp_\w+\b)|(\b(or|and)\b\s+\d+\s*=\s*\d+)|(;\s*(select|insert|update|delete|drop|alter|truncate)\b)|(\/\*|\*\/)|(--\s+)/i;

/** Reject HTML/script/PHP tags and common SQL-injection / XSS payloads in body fields. */
export function findUnsafeInputReason(value: string): string | null {
  if (SCRIPT_TAG_RE.test(value)) {
    return "Script tags are not allowed";
  }
  if (PHP_TAG_RE.test(value)) {
    return "PHP tags are not allowed";
  }
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

/** Apply injection/XSS guards to any string body field from the frontend. */
function withSafeInput<T extends z.ZodType<string>>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) {
      ctx.addIssue({ code: "custom", message: reason });
    }
  });
}

const safeTrimmed = (min: number, max: number) =>
  withSafeInput(z.string().trim().min(min).max(max));

const safeOptionalPhone = withSafeInput(z.string().trim().max(30)).optional();

const safeNullablePhone = withSafeInput(z.string().trim().max(30))
  .nullable()
  .optional();

export const registerSchema = z.object({
  first_name: safeTrimmed(1, 100),
  last_name: safeTrimmed(1, 100),
  email: withSafeInput(z.string().trim().email().max(255)),
  password: withSafeInput(z.string().min(8).max(128)),
  phone: safeOptionalPhone,
});

export const loginSchema = z.object({
  email: withSafeInput(z.string().trim().email().max(255)),
  password: withSafeInput(z.string().min(1).max(128)),
});

const jwtShape = (invalidMessage: string) =>
  z
    .string()
    .trim()
    .min(20)
    .max(4096)
    .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, invalidMessage);

export const refreshSchema = z.object({
  refreshToken: withSafeInput(jwtShape("Invalid refresh token format")),
});

/** Google Sign-In ID token from Google Identity Services (`credential`). */
export const googleAuthSchema = z.object({
  idToken: withSafeInput(jwtShape("Invalid Google ID token format")),
});

export const updateProfileSchema = z
  .object({
    first_name: safeTrimmed(1, 100).optional(),
    last_name: safeTrimmed(1, 100).optional(),
    phone: safeNullablePhone,
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
    date_of_birth: z
      .string()
      .date()
      .superRefine((value, ctx) => {
        const reason = findUnsafeInputReason(value);
        if (reason) {
          ctx.addIssue({ code: "custom", message: reason });
        }
      })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
