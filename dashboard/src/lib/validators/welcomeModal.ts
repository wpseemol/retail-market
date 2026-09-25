import { z } from "zod";
import { withSafeInput } from "./safeInput";

export const welcomeModalFormSchema = z.object({
  badge_label: withSafeInput(
    z.string().trim().min(1, "Badge is required").max(40),
  ),
  eyebrow: withSafeInput(
    z.string().trim().min(1, "Eyebrow is required").max(80),
  ),
  headline_before: withSafeInput(
    z.string().trim().min(1, "Headline start is required").max(80),
  ),
  discount_percent: z
    .number({ error: "Discount is required" })
    .int()
    .min(0, "Min 0%")
    .max(100, "Max 100%"),
  headline_after: withSafeInput(
    z.string().trim().min(1, "Headline end is required").max(120),
  ),
  body: withSafeInput(
    z.string().trim().min(1, "Body text is required").max(400),
  ),
  cta_label: withSafeInput(
    z.string().trim().min(1, "CTA label is required").max(40),
  ),
  cta_href: withSafeInput(
    z.string().trim().min(1, "CTA link is required").max(300),
  ),
  dismiss_label: withSafeInput(
    z.string().trim().min(1, "Dismiss label is required").max(60),
  ),
  countdown_seconds: z
    .number({ error: "Countdown is required" })
    .int()
    .min(5, "At least 5 seconds")
    .max(120, "Max 120 seconds"),
  product_image: withSafeInput(
    z.string().trim().min(1, "Product image path is required").max(500),
  ),
  bg_image: withSafeInput(
    z.string().trim().min(1, "Background image path is required").max(500),
  ),
});

export type WelcomeModalFormValues = z.infer<typeof welcomeModalFormSchema>;

export type WelcomeModalContent = WelcomeModalFormValues;

export const DEFAULT_WELCOME_MODAL: WelcomeModalContent = {
  badge_label: "Limited Offer",
  eyebrow: "Don't Miss Out",
  headline_before: "Get Up To",
  discount_percent: 70,
  headline_after: "Off Digital Cameras",
  body: "Flash deal ends when the timer hits zero. Shop now before this offer disappears.",
  cta_label: "Shop Now",
  cta_href: "/shop?category=cameras",
  dismiss_label: "No thanks, close",
  countdown_seconds: 30,
  product_image: "/images/camera.png",
  bg_image: "/images/hero_bg_06 1.png",
};

export function welcomeModalToFormValues(
  content: Partial<WelcomeModalContent> | null | undefined,
): WelcomeModalFormValues {
  return {
    badge_label: content?.badge_label ?? DEFAULT_WELCOME_MODAL.badge_label,
    eyebrow: content?.eyebrow ?? DEFAULT_WELCOME_MODAL.eyebrow,
    headline_before:
      content?.headline_before ?? DEFAULT_WELCOME_MODAL.headline_before,
    discount_percent:
      typeof content?.discount_percent === "number"
        ? content.discount_percent
        : DEFAULT_WELCOME_MODAL.discount_percent,
    headline_after:
      content?.headline_after ?? DEFAULT_WELCOME_MODAL.headline_after,
    body: content?.body ?? DEFAULT_WELCOME_MODAL.body,
    cta_label: content?.cta_label ?? DEFAULT_WELCOME_MODAL.cta_label,
    cta_href: content?.cta_href ?? DEFAULT_WELCOME_MODAL.cta_href,
    dismiss_label:
      content?.dismiss_label ?? DEFAULT_WELCOME_MODAL.dismiss_label,
    countdown_seconds:
      typeof content?.countdown_seconds === "number"
        ? content.countdown_seconds
        : DEFAULT_WELCOME_MODAL.countdown_seconds,
    product_image:
      content?.product_image ?? DEFAULT_WELCOME_MODAL.product_image,
    bg_image: content?.bg_image ?? DEFAULT_WELCOME_MODAL.bg_image,
  };
}
