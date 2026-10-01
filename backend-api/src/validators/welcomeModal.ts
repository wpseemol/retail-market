import { z } from "zod";
import { withSafeInput } from "./customerAuth.js";

export const updateWelcomeModalSchema = z.object({
  badge_label: withSafeInput(z.string().trim().min(1).max(40)),
  eyebrow: withSafeInput(z.string().trim().min(1).max(80)),
  headline_before: withSafeInput(z.string().trim().min(1).max(80)),
  discount_percent: z.coerce.number().int().min(0).max(100),
  headline_after: withSafeInput(z.string().trim().min(1).max(120)),
  body: withSafeInput(z.string().trim().min(1).max(400)),
  cta_label: withSafeInput(z.string().trim().min(1).max(40)),
  cta_href: withSafeInput(z.string().trim().min(1).max(300)),
  dismiss_label: withSafeInput(z.string().trim().min(1).max(60)),
  countdown_seconds: z.coerce.number().int().min(5).max(120),
  product_image: withSafeInput(z.string().trim().min(1).max(500)),
  bg_image: withSafeInput(z.string().trim().min(1).max(500)),
});

export type UpdateWelcomeModalInput = z.infer<typeof updateWelcomeModalSchema>;
