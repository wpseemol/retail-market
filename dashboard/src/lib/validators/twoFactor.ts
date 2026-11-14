import { z } from "zod";
import { withSafeInput } from "./safeInput";

export const totpCodeSchema = z.object({
  code: withSafeInput(
    z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
  ),
});

export type TotpCodeValues = z.infer<typeof totpCodeSchema>;

export const recoveryCodeSchema = z.object({
  code: withSafeInput(
    z
      .string()
      .trim()
      .min(8, "Enter a recovery code")
      .max(64, "That recovery code looks too long"),
  ),
});

export type RecoveryCodeValues = z.infer<typeof recoveryCodeSchema>;

export const disableTwoFactorSchema = z.object({
  password: withSafeInput(
    z.string().min(1, "Enter your password").max(128),
  ),
  code: withSafeInput(
    z
      .string()
      .trim()
      .min(6, "Enter your authenticator or recovery code")
      .max(64),
  ),
  recovery: z.boolean().optional(),
});

export type DisableTwoFactorValues = z.infer<typeof disableTwoFactorSchema>;
