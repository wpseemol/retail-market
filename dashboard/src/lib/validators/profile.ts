import { z } from "zod";
import { validateSafeImageFile, withSafeInput } from "./safeInput";

// ─── Profile form ─────────────────────────────────────────────────────────────

export const profileFormSchema = z.object({
  first_name: withSafeInput(
    z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(100, "First name must be at most 100 characters"),
  ),
  last_name: withSafeInput(
    z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(100, "Last name must be at most 100 characters"),
  ),
  username: withSafeInput(
    z
      .string()
      .trim()
      .max(50, "Username must be at most 50 characters"),
  ).optional().or(z.literal("")),
  phone: withSafeInput(
    z
      .string()
      .trim()
      .max(30, "Phone must be at most 30 characters"),
  ).optional().or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

// ─── Password form ────────────────────────────────────────────────────────────

export const passwordFormSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type PasswordFormValues = z.infer<typeof passwordFormSchema>;

// ─── Profile photo validation ─────────────────────────────────────────────────

export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function validateProfileImageFile(
  file: File | null | undefined,
): { ok: true } | { ok: false; message: string } {
  return validateSafeImageFile(file, PROFILE_IMAGE_MAX_BYTES, "Profile photo");
}
