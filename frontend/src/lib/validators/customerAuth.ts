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

function withSafeInput(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) {
      ctx.addIssue({ code: "custom", message: reason });
    }
  });
}

const nameFieldSchema = withSafeInput(
  z
    .string()
    .trim()
    .min(1, "This field is required")
    .max(100, "Must be at most 100 characters"),
);

const phoneFieldSchema = z
  .string()
  .trim()
  .max(30, "Phone is too long")
  .superRefine((value, ctx) => {
    if (!value) return;
    const unsafe = findUnsafeInputReason(value);
    if (unsafe) {
      ctx.addIssue({ code: "custom", message: unsafe });
      return;
    }
    if (!/^[+\d][\d\s().-]{5,29}$/.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid phone number",
      });
    }
  });

const genderFieldSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (!value) return;
    const unsafe = findUnsafeInputReason(value);
    if (unsafe) {
      ctx.addIssue({ code: "custom", message: unsafe });
      return;
    }
    if (value !== "male" && value !== "female" && value !== "other") {
      ctx.addIssue({ code: "custom", message: "Select a valid gender" });
    }
  });

const dateOfBirthFieldSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (!value) return;
    const unsafe = findUnsafeInputReason(value);
    if (unsafe) {
      ctx.addIssue({ code: "custom", message: unsafe });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return;
    }
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date" });
      return;
    }
    const today = new Date();
    if (date > today) {
      ctx.addIssue({
        code: "custom",
        message: "Date of birth cannot be in the future",
      });
    }
  });

export const updateProfileSchema = z.object({
  first_name: nameFieldSchema,
  last_name: nameFieldSchema,
  phone: phoneFieldSchema,
  gender: genderFieldSchema,
  date_of_birth: dateOfBirthFieldSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateProfileField = keyof UpdateProfileInput;

const updateProfileFieldSchemas = {
  first_name: nameFieldSchema,
  last_name: nameFieldSchema,
  phone: phoneFieldSchema,
  gender: genderFieldSchema,
  date_of_birth: dateOfBirthFieldSchema,
} as const;

export function validateUpdateProfileField(
  field: UpdateProfileField,
  value: string,
): string | undefined {
  const result = updateProfileFieldSchemas[field].safeParse(value);
  if (result.success) return undefined;
  return result.error.issues[0]?.message;
}

export function validateUpdateProfileForm(data: {
  first_name: string;
  last_name: string;
  phone: string;
  gender: string;
  date_of_birth: string;
}):
  | {
      success: true;
      data: {
        first_name: string;
        last_name: string;
        phone: string | null;
        gender: "male" | "female" | "other" | null;
        date_of_birth: string | null;
      };
    }
  | { success: false; errors: Partial<Record<UpdateProfileField, string>> } {
  const errors: Partial<Record<UpdateProfileField, string>> = {};

  for (const field of Object.keys(
    updateProfileFieldSchemas,
  ) as UpdateProfileField[]) {
    const message = validateUpdateProfileField(field, data[field]);
    if (message) errors[field] = message;
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const gender =
    data.gender === "male" ||
    data.gender === "female" ||
    data.gender === "other"
      ? data.gender
      : null;

  return {
    success: true,
    data: {
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone: data.phone.trim() || null,
      gender,
      date_of_birth: data.date_of_birth.trim() || null,
    },
  };
}
