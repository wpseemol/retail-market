import { z } from "zod";
import { withSafeInput } from "./safeInput";

/** Mirrors `loginSchema` in backend-api `routes/dashboardAuth.ts`. */
export const staffLoginSchema = z.object({
  identifier: withSafeInput(
    z
      .string()
      .trim()
      .min(1, "Enter your username, email, or phone")
      .min(3, "That looks too short")
      .max(255, "That's too long"),
  ),
  password: withSafeInput(
    z
      .string()
      .min(1, "Enter your password")
      .max(128, "Password must be at most 128 characters"),
  ),
});

export type StaffLoginValues = z.infer<typeof staffLoginSchema>;
