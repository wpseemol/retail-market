import { useOutletContext } from "react-router-dom";
import type { UseFormReturn } from "react-hook-form";
import type {
    SiteSettingsApiResponse,
    SiteSettingsFormValues,
} from "@/lib/validators/siteSettings";

export type SiteSettingsSnapshot = SiteSettingsApiResponse["settings"];

export type SiteSettingsOutletContext = {
    token: string;
    settings: SiteSettingsSnapshot;
    setSettings: (settings: SiteSettingsSnapshot) => void;
    /** Shared by Identity, Shop, Social, Analytics and Pixels — one PATCH saves them all. */
    form: UseFormReturn<SiteSettingsFormValues>;
    error: string | null;
    success: string | null;
    showError: (message: string) => void;
    showSuccess: (message: string) => void;
};

export function useSiteSettings() {
    return useOutletContext<SiteSettingsOutletContext>();
}

export function toSiteSettingsFormValues(
    s: SiteSettingsSnapshot,
): SiteSettingsFormValues {
    return {
        site_name: s.site_name,
        site_title: s.site_title,
        site_description: s.site_description,
        keywords: s.keywords ?? "",
        og_title: s.og_title ?? "",
        og_description: s.og_description ?? "",
        twitter_title: s.twitter_title ?? "",
        twitter_description: s.twitter_description ?? "",
        twitter_handle: s.twitter_handle ?? "",
        google_analytics_id: s.google_analytics_id ?? "",
        google_analytics_enabled: s.google_analytics_enabled,
        google_tag_manager_id: s.google_tag_manager_id ?? "",
        google_tag_manager_enabled: s.google_tag_manager_enabled,
        hotjar_site_id: s.hotjar_site_id ?? "",
        hotjar_enabled: s.hotjar_enabled,
        plerdy_site_id: s.plerdy_site_id ?? "",
        plerdy_enabled: s.plerdy_enabled,
        google_ads_id: s.google_ads_id ?? "",
        google_ads_enabled: s.google_ads_enabled,
        tiktok_pixel_id: s.tiktok_pixel_id ?? "",
        tiktok_enabled: s.tiktok_enabled,
        linkedin_partner_id: s.linkedin_partner_id ?? "",
        linkedin_enabled: s.linkedin_enabled,
        twitter_pixel_id: s.twitter_pixel_id ?? "",
        twitter_pixel_enabled: s.twitter_pixel_enabled,
        meta_pixel_id: s.meta_pixel_id ?? "",
        meta_pixel_enabled: s.meta_pixel_enabled,
        shop_default_view: s.shop_default_view ?? "grid4",
        shop_products_per_page: s.shop_products_per_page ?? 12,
        shop_categories_visible: s.shop_categories_visible ?? 5,
        shop_brands_visible: s.shop_brands_visible ?? 6,
        shop_see_all_label: s.shop_see_all_label ?? "See all",
        shop_show_less_label: s.shop_show_less_label ?? "Show less",
    };
}

export const EMPTY_SITE_SETTINGS_FORM: SiteSettingsFormValues = {
    site_name: "",
    site_title: "",
    site_description: "",
    keywords: "",
    og_title: "",
    og_description: "",
    twitter_title: "",
    twitter_description: "",
    twitter_handle: "",
    google_analytics_id: "",
    google_analytics_enabled: false,
    google_tag_manager_id: "",
    google_tag_manager_enabled: false,
    hotjar_site_id: "",
    hotjar_enabled: false,
    plerdy_site_id: "",
    plerdy_enabled: false,
    google_ads_id: "",
    google_ads_enabled: false,
    tiktok_pixel_id: "",
    tiktok_enabled: false,
    linkedin_partner_id: "",
    linkedin_enabled: false,
    twitter_pixel_id: "",
    twitter_pixel_enabled: false,
    meta_pixel_id: "",
    meta_pixel_enabled: false,
    shop_default_view: "grid4",
    shop_products_per_page: 12,
    shop_categories_visible: 5,
    shop_brands_visible: 6,
    shop_see_all_label: "See all",
    shop_show_less_label: "Show less",
};
