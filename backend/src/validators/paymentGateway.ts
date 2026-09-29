import { z } from "zod";

/** SSLCOMMERZ store IDs look like `yourstore6abb022b347dd`. */
const storeIdField = z
  .union([
    z
      .string()
      .trim()
      .min(3, "Store ID looks too short")
      .max(100)
      .regex(/^[A-Za-z0-9_-]+$/, "Store ID can only contain letters, numbers, dash and underscore"),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((v) => (v === "" ? null : v));

/** `undefined` keeps the stored password, `null` clears it, a string replaces it. */
const storePasswordField = z
  .union([
    z
      .string()
      .trim()
      .min(4, "Store password looks too short")
      .max(255)
      .regex(/^[\x21-\x7e]+$/, "Store password cannot contain spaces or non-ASCII characters"),
    z.null(),
  ])
  .optional();

export const updateSslcommerzSchema = z
  .object({
    is_enabled: z.boolean().optional(),
    is_live: z.boolean().optional(),
    store_id: storeIdField,
    store_password: storePasswordField,
  })
  .strict();

export const revealPaymentSecretsSchema = z.object({
  password: z.string().min(1, "Password is required").max(200),
});

export type UpdateSslcommerzInput = z.infer<typeof updateSslcommerzSchema>;
