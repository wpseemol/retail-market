import { z } from "zod";
import { withSafeInput } from "@/lib/validators/safeInput";

export type SslcommerzSettingsDto = {
  saved: boolean;
  is_enabled: boolean;
  is_live: boolean;
  has_store_id: boolean;
  has_store_password: boolean;
  ready: boolean;
  updated_at: string | null;
  active_source: "dashboard" | "env" | "none";
  active_mode: "live" | "sandbox" | null;
  env_fallback: boolean;
  callback_urls: { success: string; fail: string; cancel: string; ipn: string };
  callbacks_public: boolean;
};

export type PaymentGatewayStateDto = { sslcommerz: SslcommerzSettingsDto };

export type PaymentSecretsDto = {
  secrets: { sslcommerz: { store_id: string | null; store_password: string | null } };
};

export const sslcommerzFormSchema = z.object({
  is_enabled: z.boolean(),
  is_live: z.boolean(),
  /** Empty = keep the saved store ID. */
  store_id: withSafeInput(
    z
      .string()
      .trim()
      .max(100)
      .regex(/^[A-Za-z0-9_-]*$/, "Only letters, numbers, dash and underscore")
      .refine((v) => v === "" || v.length >= 3, "Store ID looks too short"),
  ),
  clear_store_id: z.boolean(),
  /** Empty = keep the saved password. */
  store_password: z
    .string()
    .trim()
    .max(255)
    .regex(/^[\x21-\x7e]*$/, "No spaces or non-ASCII characters")
    .refine((v) => v === "" || v.length >= 4, "Store password looks too short"),
  clear_password: z.boolean(),
});

export type SslcommerzFormValues = z.infer<typeof sslcommerzFormSchema>;

export function toSslcommerzFormValues(s: SslcommerzSettingsDto): SslcommerzFormValues {
  return {
    is_enabled: s.is_enabled,
    is_live: s.is_live,
    store_id: "",
    clear_store_id: false,
    store_password: "",
    clear_password: false,
  };
}

export function toSslcommerzApiBody(v: SslcommerzFormValues) {
  const storeId = v.store_id.trim();
  return {
    is_enabled: v.is_enabled,
    is_live: v.is_live,
    ...(v.clear_store_id ? { store_id: null } : storeId ? { store_id: storeId } : {}),
    ...(v.clear_password
      ? { store_password: null }
      : v.store_password
        ? { store_password: v.store_password }
        : {}),
  };
}
