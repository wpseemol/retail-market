# dashboard — Changelog

Every change made to this app is recorded here, newest first.
Format: date heading, then one bullet per change with the files touched.

## 2026-10-01

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
