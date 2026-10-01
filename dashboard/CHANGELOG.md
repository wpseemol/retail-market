# dashboard — Changelog

Every change made to this app is recorded here, newest first.
Format: date heading, then one bullet per change with the files touched.

## 2026-10-01

### Product review moderation (Support & Quality)
- New `src/pages/support/ReviewsModerationPage.tsx` (+ `index.ts`) at `/support/reviews` (`/reviews` redirects): tabs All / Pending / Approved / Hidden with counts, flagged-only toggle, search, rating filter, desktop table and mobile cards (product thumb + title, stars, customer name/email/phone, Verified Purchase pill, status badge).
- Row actions: view, open on storefront, approve, hide/show, reject (admins), flag/clear flag, vendor reply, delete. Delete asks through `useConfirm()` and is disabled with a tooltip for moderators; vendors don't see it.
- New `src/components/reviews/` (`ReviewStars`, `ReviewBadges`, `ReviewReplyDialog` — shadcn Form; removing a reply is confirmed).
- New `src/lib/reviews.ts` (types, status meta, `reviewStatusBlockReason` mirroring the API rules) and `src/lib/validators/review.ts`.
- `src/lib/rbac.ts`: `REVIEW_ROLES`, `REVIEW_FLAG_ROLES`, `REVIEW_REPLY_ROLES`, `REVIEW_DELETE_ROLES`.
- `src/App.tsx`: new route; `src/components/dashboard/app-sidebar.tsx`: "Support & Quality" group with "Product reviews".

### Pages reorganized into feature domains (RBAC-aligned)
Route URLs and effective access are unchanged; only file locations, imports, and guard grouping changed. Moves done with `git mv` to keep history.
- `src/pages/LoginPage.tsx` → `src/pages/auth/LoginPage.tsx`
- `src/pages/HomePage.tsx` → `src/pages/overview/HomePage.tsx`
- `src/pages/RolePage.tsx` → `src/pages/overview/RolePage.tsx`
- `src/pages/ProfilePage.tsx` → `src/pages/account/ProfilePage.tsx`
- `src/pages/NotificationsPage.tsx` → `src/pages/account/NotificationsPage.tsx`
- `src/pages/OrdersPage.tsx` → `src/pages/orders/OrdersPage.tsx`
- `src/pages/ProductsPage.tsx`, `ProductCreatePage.tsx`, `ProductEditPage.tsx` → `src/pages/catalog/products/`
- `src/pages/CategoriesPage.tsx`, `CategoryCreatePage.tsx`, `CategoryEditPage.tsx` → `src/pages/catalog/categories/`
- `src/pages/BrandsPage.tsx`, `BrandCreatePage.tsx`, `BrandEditPage.tsx` → `src/pages/catalog/brands/`
- `src/pages/ShopsPage.tsx` → `src/pages/stores/StoresPage.tsx`; `ShopCreatePage.tsx` → `stores/StoreCreatePage.tsx`; `ShopEditPage.tsx` → `stores/StoreEditPage.tsx` (file names now match the `Store*` exports)
- `src/pages/UsersPage.tsx`, `UserEditPage.tsx` → `src/pages/access/` (staff management)
- `src/pages/settings/` → `src/pages/system/settings/` (System Settings, super_admin only):
  - root: `SiteSettingsLayout.tsx`, `settingsContext.ts`, `settingsTabs.ts`, `GeneralSettingsForm.tsx`, `index.ts`
  - `storefront/`: `IdentitySettingsPage`, `HeaderSettingsPage`, `FooterSettingsPage`, `HomeSettingsPage`, `ShopSettingsPage`, `SocialShareSettingsPage`
  - `integrations/` (credential-bearing): `SocialLoginSettingsPage`, `SmsGatewaySettingsPage`, `EmailProviderSettingsPage`, `PaymentSettingsPage`, `ShippingSettingsPage`
  - `tracking/`: `AnalyticsSettingsPage`, `PixelsSettingsPage`
  - `audit/`: `HistorySettingsPage`
  - All 14 sub-folder pages: `./settingsContext` / `./GeneralSettingsForm` imports → `../`.
  - `index.ts` re-exports from the new sub-folders.
- New barrels: `src/pages/{auth,overview,account,orders,catalog,stores,access}/index.ts`.
- New `src/lib/rbac.ts`: route role lists named after the `TARGET_REQUIREMENTS.md` §2 matrix (`SYSTEM_SETTINGS_ROLES`, `STAFF_MANAGEMENT_ROLES`, `ORDER_ROLES`, `PRODUCT_ROLES`, `TAXONOMY_VIEW_ROLES`, `TAXONOMY_MANAGE_ROLES`, `STORE_ROLES`, `NOTIFICATION_ROLES`, `OVERVIEW_ROLES`, `WORKSPACE_ROLES`), matching the backend's current `requireRoles(...)`.
- `src/App.tsx`: imports from the domain barrels; route tree regrouped into one `ProtectedRoute` block per domain using `lib/rbac.ts` (settings, users, and the super-admin workspace are now separate blocks); `OverviewGate` uses `OVERVIEW_ROLES`.
- `src/components/ProtectedRoute.tsx`: `roles` prop accepts `readonly StaffRole[]`.
- `AGENTS.md`: new `pages/` tree, `lib/rbac.ts`, and the "Pages & routes" convention.

### Docs
- Added `AGENTS.md` and this `CHANGELOG.md`.
- `Dockerfile`: copies `backend-api/package.json` after the backend folder rename.

### Invoice brand logo
- `public/logo/niyenin-print.png`: trimmed Niyenin wordmark (566×225).
- `src/lib/siteBranding.ts`: `PRINT_LOGO`, synchronous `getPrintBranding()`; `invalidateSiteBrandingCache` now refetches.
- `src/components/orders/printInvoices.ts`: header shows the logo + "INVOICE" label, keeps colours when printing, waits for images (max 2.5 s) before `print()`. Signature is now `printInvoices(orders)`.

### Delete confirmation modal everywhere
- New `src/components/providers/ConfirmProvider.tsx` with `useConfirm()`; mounted in `src/main.tsx`.
- Replaced `window.confirm` in BrandEditPage, CategoryEditPage, ProductEditPage (also on remote image remove), ShopEditPage (store delete, clear history), HistorySettingsPage, SiteNavMenuEditor.
- Added confirms to notification removal (`notifications-menu.tsx`, NotificationsPage).

### Order deletion
- `src/lib/orders.ts`: `ORDER_DELETE_ROLES`, `orderDeleteBlockReason()`.
- `src/pages/OrdersPage.tsx`: "Delete order" row action, "Delete Selected" bulk action, delete from drawer and detail page — all behind the confirm modal; disabled with the reason when not deletable.
- `src/components/orders/OrderDetailPanel.tsx`: optional `onDelete` / `deleting` props.

### Order Management page
- `src/pages/OrdersPage.tsx`: KPI cards, search + filters, status tabs with counts, table with selection, bulk bar (status, export, print), detail drawer, status dialog, pagination, detail page.
- `src/components/orders/*`: `OrderBadges`, `OrderDetailPanel`, `OrderStatusDialog`, `printInvoices`, `useOrderActions`.
- `src/lib/api.ts`: `apiDownload()` for CSV export.
- `src/lib/validators/order.ts`: Zod schemas for status/tracking forms.
- KPI cards stack on mobile (`flex-col sm:flex-row`).

### Payment gateways
- Clear message when the test call returns `PAYMENT_MODE_MISMATCH` (sandbox vs live).

### Image hints
- `src/lib/imagePresets.ts`: recommended ratio and pixel size (e.g. 300×300) per upload type, shown on every image dropzone.

## Earlier

- `src/pages/settings/ShopSettingsPage.tsx`: default products-per-page for the storefront shop.
