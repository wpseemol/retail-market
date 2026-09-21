import { z } from "zod";

const HTML_TAG_RE = /<\s*\/?\s*[a-zA-Z!][^>]*>/;
const SCRIPT_TAG_RE = /<\s*\/?\s*script\b/i;
const PHP_TAG_RE = /<\?(?:php|=)?|\?>/i;
const JS_PROTOCOL_RE = /javascript\s*:/i;
const EVENT_HANDLER_RE = /\bon[a-z]+\s*=/i;

/** Compound SQL payloads — avoids blocking normal passwords that contain `'`, `"`, or `;`. */
const SQL_INJECTION_RE =
  /(\bunion\s+select\b)|(\bselect\b.+\bfrom\b)|(\binsert\s+into\b)|(\bdelete\s+from\b)|(\bdrop\s+(table|database)\b)|(\balter\s+table\b)|(\btruncate\s+table\b)|(\b(exec|execute)\s*\()|(\bxp_\w+\b)|(\b(or|and)\b\s+\d+\s*=\s*\d+)|(;\s*(select|insert|update|delete|drop|alter|truncate)\b)|(\/\*|\*\/)|(--\s+)/i;

/** Reject HTML/script/PHP tags and common SQL-injection / XSS payloads. */
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

export const emailFieldSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const unsafe = findUnsafeInputReason(value);
    if (unsafe) {
      ctx.addIssue({ code: "custom", message: unsafe });
      return;
    }
    if (!value) {
      ctx.addIssue({ code: "custom", message: "Email is required" });
      return;
    }
    if (value.length > 255) {
      ctx.addIssue({ code: "custom", message: "Email is too long" });
      return;
    }
    if (!z.string().email().safeParse(value).success) {
      ctx.addIssue({ code: "custom", message: "Enter a valid email" });
    }
  });

export const passwordFieldSchema = z.string().superRefine((value, ctx) => {
  const unsafe = findUnsafeInputReason(value);
  if (unsafe) {
    ctx.addIssue({ code: "custom", message: unsafe });
    return;
  }
  if (!value) {
    ctx.addIssue({ code: "custom", message: "Password is required" });
    return;
  }
  if (value.length > 128) {
    ctx.addIssue({ code: "custom", message: "Password is too long" });
  }
});

/** Storefront customer login — required fields + unsafe-input guards. */
export const loginSchema = z.object({
  email: emailFieldSchema,
  password: passwordFieldSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginField = keyof LoginInput;

const fieldSchemas = {
  email: emailFieldSchema,
  password: passwordFieldSchema,
} as const;

/** Validate a single login field quickly (on change / blur). */
export function validateLoginField(
  field: LoginField,
  value: string,
): string | undefined {
  const result = fieldSchemas[field].safeParse(value);
  if (result.success) return undefined;
  return result.error.issues[0]?.message;
}

/** Validate every login field and return all errors together. */
export function validateLoginForm(data: {
  email: string;
  password: string;
}):
  | { success: true; data: LoginInput }
  | { success: false; errors: Partial<Record<LoginField, string>> } {
  const errors: Partial<Record<LoginField, string>> = {};

  for (const field of Object.keys(fieldSchemas) as LoginField[]) {
    const message = validateLoginField(field, data[field]);
    if (message) errors[field] = message;
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        (key === "email" || key === "password") &&
        errors[key] === undefined
      ) {
        errors[key] = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true, data: parsed.data };
}
