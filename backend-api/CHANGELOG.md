# backend-api — Changelog

Every change made to this app is recorded here, newest first.
Format: date heading, then one bullet per change with the files touched.

## 2026-10-01

### SEO overhaul + brand / store showcase pages
- `prisma/schema.prisma` + migration `20261001100000_showcase_seo`: `Vendor` and `Brand` gain `tagline`, `accent_color`, `seo_title`, `seo_description`, `seo_keywords`, `noindex`, `og_image_id`, `showcase` (JSON). `Brand` also gets `vendor_id` (linked store) and `banner_id`. `SiteSettings` gets `seo_title_template`, `seo_noindex_site`, `google_site_verification`, `bing_site_verification`, `seo_pages` (JSON). New media collections for share images and brand banners.
- New `src/validators/showcase.ts` (hero style, ordered sections, about, contact, social with per-network host checks, policies, announcement; safe-input on every string) and `src/validators/seo.ts`. `src/validators/brand.ts`: `mine` list filter + owner body. `src/validators/siteSettings.ts`: SEO keys no longer accepted on the general settings PATCH.
- New `src/lib/showcase.ts` (defaults, normalising stored JSON, public payload), `src/lib/showcaseMedia.ts` (share image / banner finalize — magic-byte check, always resized, size re-checked after resize), `src/lib/revalidate.ts` (fire-and-forget `POST {FRONTEND_URL}/api/revalidate` with `x-revalidate-secret` so storefront caches refresh right after an edit). `src/lib/env.ts` + `.env.example`: `REVALIDATE_SECRET`. `src/lib/imageOptimize.ts` / `src/lib/shopImage.ts`: banner and share-image presets.
- `src/routes/dashboardVendors.ts`: `GET/PATCH /:idOrSlug/showcase`, `POST/DELETE /:idOrSlug/og-image`. Admin may override any store's page design (logged as an override) but can no longer create stores, delete them, or edit store settings; delete stays super_admin-only. The showcase GET now also returns `shop_name`, `logo`, `banner`.
- `src/routes/dashboardBrands.ts`: `PATCH /:id/owner` (super_admin/admin link a brand to one store), `GET/PATCH /:id/showcase`, `POST/DELETE /:id/banner`, `POST/DELETE /:id/og-image`, `?mine=1` vendor list, `permissions { manage, assign_owner, showcase }` on detail. The linked vendor edits the page only, never name/slug/active.
- New `src/routes/dashboardSeo.ts` (`/api/dashboard/seo`, super_admin + admin): title template, per-page defaults, OG/Twitter, verification codes, site-wide noindex, share image.
- New public routes: `src/routes/publicBrands.ts` (`/api/brands`, `/api/brands/:slug` with products, featured, linked store, reviews), `src/routes/publicSitemap.ts` (sitemap entries for stores, brands, products, categories). `src/routes/publicShops.ts`: showcase payload, linked brands, review summary, `sort`. `src/routes/publicSiteSettings.ts`: nested `seo` block. `src/server.ts` mounts the new routers.
- `API.md`: all of the above, including multipart field names, limits and the role matrix.
- Verified with role smoke tests over HTTP: vendors get 403 on unlinked brands, brand linking and global SEO; admin can override a store design but gets 403 on store create/delete.

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
