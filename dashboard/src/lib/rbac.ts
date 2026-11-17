import type { StaffRole } from "@/lib/api";

/**
 * Route-level role lists, named after the RBAC matrix in TARGET_REQUIREMENTS.md §2.
 * Keep in sync with `requireRoles(...)` in backend-api; widening a list here
 * without the API change only produces 403s.
 */

export const ALL_STAFF: readonly StaffRole[] = ["super_admin", "admin", "moderator", "vendor"];

/** Global overview KPIs (GMV, payouts). */
export const OVERVIEW_ROLES: readonly StaffRole[] = ["super_admin", "admin"];

/** System Settings & Global Config — Super Admin only. */
export const SYSTEM_SETTINGS_ROLES: readonly StaffRole[] = ["super_admin"];

/**
 * Admin & Moderator Management. The matrix lets Admins manage Moderators, but
 * `/api/dashboard/users` is still super_admin only.
 */
export const STAFF_MANAGEMENT_ROLES: readonly StaffRole[] = ["super_admin"];

/** Order Management — global for admins, inspect for moderators, own orders for vendors. */
export const ORDER_ROLES: readonly StaffRole[] = ALL_STAFF;

/** Product Listings — vendors work on their own catalog. */
export const PRODUCT_ROLES: readonly StaffRole[] = ALL_STAFF;

/** Taxonomy (categories, brands): everyone can browse, only staff can mutate. */
export const TAXONOMY_VIEW_ROLES: readonly StaffRole[] = ALL_STAFF;
export const TAXONOMY_MANAGE_ROLES: readonly StaffRole[] = ["super_admin", "admin", "moderator"];

/**
 * Vendor store profiles — vendors manage their own; admins can open any store to
 * override its page design (logo, banner, showcase) but not create or delete stores.
 * Moderators list stores to assign helper vendors.
 */
export const STORE_ROLES: readonly StaffRole[] = [
  "super_admin",
  "admin",
  "moderator",
  "vendor",
];
/** Create a store (super_admin or vendor owner). */
export const STORE_MANAGE_ROLES: readonly StaffRole[] = ["super_admin", "vendor"];
/**
 * Open store settings page: owners/super_admin edit profile; admin/moderator
 * manage the helper team; super_admin also sets fee plans.
 */
export const STORE_EDIT_ROLES: readonly StaffRole[] = [
  "super_admin",
  "admin",
  "moderator",
  "vendor",
];
/** Assign / remove store helpers (not fee plan, not ownership). */
export const STORE_TEAM_ROLES: readonly StaffRole[] = [
  "super_admin",
  "admin",
  "moderator",
];
export const STORE_DELETE_ROLES: readonly StaffRole[] = ["super_admin"];
export const STORE_FEE_ROLES: readonly StaffRole[] = ["super_admin"];

/** Global storefront SEO (`/api/dashboard/seo`). */
export const SEO_ROLES: readonly StaffRole[] = ["super_admin", "admin"];
/** Storefront content pages (FAQ, Terms) — mirrors `/api/dashboard/pages`. */
export const CONTENT_PAGE_ROLES: readonly StaffRole[] = ["super_admin", "admin"];

/**
 * Home hero + home blocks (promo slider, welcome modal, etc.).
 * Super admin also keeps Settings → Home (section order + full site chrome).
 */
export const HOME_CONTENT_ROLES: readonly StaffRole[] = ["super_admin", "admin"];

/**
 * Brand showcase pages: admins edit any brand; vendors only brands linked to their
 * store (the API checks ownership). Linking a brand to a store is admin-only.
 */
export const BRAND_SHOWCASE_ROLES: readonly StaffRole[] = ["super_admin", "admin", "vendor"];
export const BRAND_OWNER_ROLES: readonly StaffRole[] = ["super_admin", "admin"];

export const NOTIFICATION_ROLES: readonly StaffRole[] = ALL_STAFF;

/**
 * Support & Quality — product reviews. Everyone opens the queue (vendors see their own
 * store only); moderators approve / hide / flag, admins also reject and delete.
 */
export const REVIEW_ROLES: readonly StaffRole[] = ALL_STAFF;
export const REVIEW_FLAG_ROLES: readonly StaffRole[] = ["super_admin", "admin", "moderator"];
export const REVIEW_REPLY_ROLES: readonly StaffRole[] = ["super_admin", "admin", "vendor"];
export const REVIEW_DELETE_ROLES: readonly StaffRole[] = ["super_admin", "admin"];

/** Become-a-seller application queue — admin + super_admin only. */
export const SELLER_APPLICATION_ROLES: readonly StaffRole[] = ["super_admin", "admin"];

/** Per-role workspace landing pages; super_admin can open all of them. */
export const WORKSPACE_ROLES: Record<StaffRole, readonly StaffRole[]> = {
  super_admin: ["super_admin"],
  admin: ["admin", "super_admin"],
  moderator: ["moderator", "super_admin"],
  vendor: ["vendor", "super_admin"],
};
