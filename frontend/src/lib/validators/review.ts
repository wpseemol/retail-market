import { z } from "zod";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { normalizePhone } from "@/lib/phone";
import { findUnsafeInputReason } from "./customerAuth";

type Messages = Dictionary["reviews"]["validation"];

function safe(schema: z.ZodString) {
  return schema.superRefine((value, ctx) => {
    const reason = findUnsafeInputReason(value);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  });
}

/** One input that accepts either the checkout email or the checkout phone. */
export function parseReviewContact(raw: string): { email: string } | { phone: string } | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.includes("@")) {
    return z.string().email().safeParse(value).success ? { email: value.toLowerCase() } : null;
  }
  return normalizePhone(value) ? { phone: value } : null;
}

/** Step 1 — the email or phone used at checkout. */
export function createReviewContactSchema(m: Messages) {
  return z.object({
    contact: safe(z.string().trim().min(1, m.contactRequired).max(255, m.contactInvalid)).refine(
      (value) => parseReviewContact(value) !== null,
      m.contactInvalid,
    ),
  });
}

export type ReviewContactValues = z.infer<ReturnType<typeof createReviewContactSchema>>;

/** Step 2 — the review itself. Photos are checked separately before upload. */
export function createReviewSchema(m: Messages) {
  return z.object({
    name: safe(z.string().trim().min(2, m.nameShort).max(80, m.nameLong)),
    rating: z.number().int().min(1, m.rating).max(5, m.rating),
    comment: safe(z.string().trim().min(10, m.commentShort).max(2000, m.commentLong)),
  });
}

export type ReviewValues = z.infer<ReturnType<typeof createReviewSchema>>;
