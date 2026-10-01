# backend-api — Changelog

Every change made to this app is recorded here, newest first.
Format: date heading, then one bullet per change with the files touched.

## 2026-10-01

### Buyers can edit and delete their own review
- `src/routes/productReviews.ts`: new `PATCH /:reviewId` (multipart; `keep_images` + new `images`, max 4 total) and `DELETE /:reviewId` (hard delete + photo files). Ownership = the checkout email/phone or the signed-in account matches the review (`REVIEW_NOT_OWNER` 403 otherwise); rate limit `REVIEW_MANAGE` 20 / hour. Edits keep staff decisions (hidden / rejected) and go back to `pending` only when `REVIEWS_REQUIRE_APPROVAL=true`.
- `check-eligibility` now returns the caller's own review (with `status`) when `reason` is `already_reviewed`, and signed-in requests no longer need an email or phone (eligibility, submit, edit and delete all match the account).
- Photo finalize / media-row creation moved into shared helpers in the router; `src/lib/productReviews.ts` gains `findOwnReview()`, `toOwnReview()` and `removeReviewMediaFiles()` (also used by the dashboard delete).
- `src/validators/productReview.ts`: contact is optional at schema level (routes enforce "contact or signed in"); new `updateOwnReviewSchema`, `reviewIdParamSchema`.
- `API.md` updated.

### Full reviewer names
- `src/lib/productReviews.ts`: `publicAuthorName()` now returns the trimmed full name instead of "First L.", so public reviews, the JSON-LD author and the eligibility `authorName` carry the full name. `API.md` updated.

### Review name auto-fill
- `src/routes/productReviews.ts`: `POST /check-eligibility` also returns `authorName` (the shortened public name from the order, e.g. "Rahim K.", never the full name); `POST /` accepts an optional `author_name` override.
- `src/validators/productReview.ts`: `author_name` (2–80, safe input). `API.md` updated.

### Purchase-verified product reviews
- `prisma/schema.prisma` + migration `20261001030000_product_reviews`: new `ProductReview` model (`product_reviews` table) with statuses `pending | approved | hidden | rejected`, flag fields, moderator tracking, vendor reply, unique `(order_id, product_id)`; new `review_images` media collection. The legacy `Review` model is untouched.
- `src/lib/productReviews.ts`: eligibility lookup (order matched by email OR phone or logged-in user, `delivered` + `paid`, contains the product, not reviewed yet), public author name ("Rahim K."), summary with average and 1–5 breakdown, public/dashboard serializers (vendors see masked contact details).
- `src/routes/productReviews.ts` (mounted at `/api/products/:idOrSlug/reviews`): `GET /` approved reviews + summary, `POST /check-eligibility`, `POST /` multipart submit (403 `REVIEW_NOT_ELIGIBLE`, 409 `REVIEW_ALREADY_SUBMITTED`).
- `src/routes/dashboardReviews.ts` (mounted at `/api/dashboard/reviews`): list with status counts, `PATCH /:id/status`, `PATCH /:id/flag`, `PATCH /:id/reply`, `DELETE /:id`. Role rules: admins do everything; moderators approve/hide/flag but cannot reject or delete; vendors see only their shop's reviews, can hide/show and reply, and cannot re-show a review hidden by staff.
- `src/lib/reviewImage.ts`, `src/middleware/upload.ts` (`reviewImageUpload`), `src/lib/imageOptimize.ts` (`review` preset): up to 4 photos × 2 MB, magic-byte check, always resized to WebP (max 1200px) with a size re-check.
- `src/lib/rateLimit.ts`: small in-memory per-IP limiter (eligibility 10 / 10 min, submit 5 / hour).
- `src/validators/productReview.ts`: Zod schemas with safe-input guards for every string.
- `src/lib/env.ts`, `.env.example`: `REVIEWS_REQUIRE_APPROVAL` (default `false` = verified reviews go live immediately).
- `src/routes/publicProducts.ts`: exports `activeProductScope`; `src/server.ts`: mounts both routers.
- `API.md`: new "Product reviews" and "Dashboard reviews" sections.

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
