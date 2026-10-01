# backend-api — Changelog

Every change made to this app is recorded here, newest first.
Format: date heading, then one bullet per change with the files touched.

## 2026-10-01

### Renamed folder `backend/` → `backend-api/`
- Package name is now `backend-api` (`package.json`).
- Updated `pnpm-workspace.yaml`, root `package.json` (`--prefix backend-api`), `Dockerfile`, root `docker-compose.yml` (dockerfile, env_file, uploads volume), `.env.example`, `src/lib/env.ts`, `scripts/extract-category-icons.mjs`, `README.md`, `GEMINI.md`, `.cursor/rules/*`.
- Kept on purpose: compose service name `backend` (used by `INTERNAL_API_URL`), root script names `dev:backend` / `build:backend`, `service: "backend"` in the health response.
- Added `AGENTS.md` and this `CHANGELOG.md`.

### Order deletion
- `src/routes/dashboardOrders.ts`: `DELETE /api/dashboard/orders/:id` and `POST /api/dashboard/orders/bulk-delete`.
  - Roles: `super_admin`, `admin` only (`requireOrderDeleter`).
  - Only orders with status `pending`/`cancelled` and payment not `paid`/`partially_refunded`/`refunded` can be deleted (`deleteBlockReason()`).
  - Single delete returns 409 `ORDER_NOT_DELETABLE` or `ORDER_CHANGED`; bulk returns `{ message, deleted, skipped }`.
  - `deleteMany` is guarded by status + payment_status; items, addresses and payments cascade.
- `src/validators/order.ts`: shared `orderIdList`, new `bulkOrderDeleteSchema`.
- `API.md`: documented both endpoints.

### Order management API
- Migration `20261001020000_order_fulfilment`: `payment_channel`, courier, tracking number, `shipped_at`, `delivered_at` (with backfill).
- `src/routes/dashboardOrders.ts`: list with search / filters / status counts, CSV export, status change, bulk status, tracking update.
- CSV export prints Bangladeshi phones as `01XXXXXXXXX` (strips `+880`).
- `src/lib/sslcommerz.ts`: records the payment channel when a payment settles.
- `src/server.ts`: CORS `exposedHeaders: ["Content-Disposition", "X-Total-Rows"]`.
- `API.md`: documented the orders endpoints.

### SSLCommerz fix
- Fixed `is_live` handling so sandbox/live credentials hit the right host.
- Gateway test endpoint returns `PAYMENT_MODE_MISMATCH` when the store id does not match the selected mode.

### Image optimisation
- `scripts/optimize-images.ts` (`images:optimize`): resizes/re-encodes stored media, keeps the originals, optional `--prune-orphans`.

### Cart
- Migration `20261001000000_cart_item_selected`: `selected` flag on cart items.
- `src/routes/customerCart.ts`, `src/lib/cart.ts`, `src/validators/cart.ts`: DB cart for logged-in users and merge of the guest cookie cart on login (existing product → quantity increased).

## Earlier

- Shop catalog setting `shop_products_per_page` (default 12) exposed to the storefront and editable from the dashboard.
- Base platform: users/sessions, media, catalog (products, variants, brands, categories), vendors/stores, site settings & history, home blocks, social login, SMS/email providers, shipping fees, payment gateways.
