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

/** Vendor store profiles — vendors manage their own. */
export const STORE_ROLES: readonly StaffRole[] = ["super_admin", "vendor"];

export const NOTIFICATION_ROLES: readonly StaffRole[] = ALL_STAFF;

/** Per-role workspace landing pages; super_admin can open all of them. */
export const WORKSPACE_ROLES: Record<StaffRole, readonly StaffRole[]> = {
  super_admin: ["super_admin"],
  admin: ["admin", "super_admin"],
  moderator: ["moderator", "super_admin"],
  vendor: ["vendor", "super_admin"],
};
