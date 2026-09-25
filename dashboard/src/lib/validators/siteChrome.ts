import { z } from "zod";
import { findUnsafeInputReason, withSafeInput } from "./safeInput";

function optionalSafe(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .superRefine((val, ctx) => {
      if (!val) return;
      const reason = findUnsafeInputReason(val);
      if (reason) ctx.addIssue({ code: "custom", message: reason });
    });
}

export const siteChromeFormSchema = z.object({
  topbar_email: optionalSafe(160),
  topbar_phone: optionalSafe(40),
  footer_blurb: optionalSafe(500),
  footer_phone: optionalSafe(40),
  footer_callout: optionalSafe(120),
  social_facebook: optionalSafe(300),
  social_twitter: optionalSafe(300),
  social_youtube: optionalSafe(300),
  social_linkedin: optionalSafe(300),
  social_instagram: optionalSafe(300),
});

export type SiteChromeFormValues = z.infer<typeof siteChromeFormSchema>;

export const siteNavItemFormSchema = z.object({
  label: withSafeInput(
    z.string().trim().min(1, "Label is required").max(120),
  ),
  href: withSafeInput(z.string().trim().min(1, "URL / path is required").max(500)),
  external: z.boolean(),
  is_enabled: z.boolean(),
});

export type SiteNavItemFormValues = z.infer<typeof siteNavItemFormSchema>;

export type SiteNavMenu =
  | "header"
  | "footer_find"
  | "footer_care"
  | "footer_sell";

export type SiteNavItemDto = {
  id: string;
  menu: string;
  label: string;
  href: string;
  external: boolean;
  position: number;
  is_enabled: boolean;
  parent_id: string | null;
  children: SiteNavItemDto[];
};

export type HomeSectionDto = {
  id: string;
  key: string;
  label: string;
  position: number;
  is_enabled: boolean;
};

export const NAV_MENU_LABELS: Record<SiteNavMenu, string> = {
  header: "Header menu",
  footer_find: "Footer · Find it fast",
  footer_care: "Footer · Customer care",
  footer_sell: "Footer · Sell & manage",
};
