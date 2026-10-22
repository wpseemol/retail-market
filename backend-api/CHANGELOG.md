# backend-api — Changelog

Every change made to this app is recorded here, newest first.
Format: date heading, then one bullet per change with the files touched.

## 2026-10-22

### Reject unsafe input and oversized ids before they reach the database

- `src/validators/productId.ts`: a non-numeric product id no longer throws inside Zod (cart resolve and wishlist were returning 500).
- `src/routes/dashboardUsers.ts`: user search `q` / `roles` go through the safe-input check; ids that do not fit a MySQL bigint return 400.
- `src/controllers/customerAddressController.ts`: address update and delete use `parseBigIntId`.
- `src/routes/dashboardVendors.ts`: shop list query and slug preview use Zod and reject script, PHP, and SQL-like text.
- `src/routes/dashboardProducts.ts`: product slug preview uses the same safe-input check as categories and brands.
- `src/routes/publicProducts.ts`: catalog `category` and `brand` filters reject unsafe text instead of ignoring it.
- `src/routes/customerOrders.ts`: a malformed coupon body returns 400, not a fake “invalid coupon”.

## 2026-10-16

### Harden phone OTP `via` (WhatsApp / SMS) against abuse

- `src/validators/customerAuth.ts`: `sendPhoneCodeSchema` is `.strict()`; `via` stays enum-only (`sms` | `whatsapp`).
- `src/controllers/customerAuthController.ts`: honour `via` only when that gateway is ready (or the shared local console fallback when neither is); pin `via` to the union before send.
- `src/lib/verification.ts`: coerce unknown `phoneDelivery` to `sms`.
- `src/routes/customerAuth.ts`: IP rate limits on verify send (20/h) and confirm (40/h).

### Fix phone OTP channel flags when only one gateway is configured

- `src/controllers/customerAuthController.ts`: `phone_channels` no longer marks WhatsApp (or SMS) available in development just because `NODE_ENV !== production`. Console fallback is only advertised when **neither** gateway is set up. Sending `via: "whatsapp"` while only SMS is live (or the reverse) now returns `503 *_UNAVAILABLE` instead of logging a fake send.

### WhatsApp OTP for phone verification

- `prisma/schema.prisma` + migration `20261016090000_whatsapp_gateway_providers`: table `whatsapp_gateway_providers` (Meta Cloud + Twilio WhatsApp), encrypted access token, phone number id, template name/language, Graph API version, optional button param.
- `src/lib/whatsappGateway.ts`, `src/validators/whatsappGateway.ts`, `src/routes/dashboardWhatsAppGateway.ts`: dashboard GET/PATCH/reveal/test under `/api/dashboard/site-settings/whatsapp-gateway` (mirrors SMS gateway).
- `src/lib/messaging.ts` + `src/lib/verification.ts`: `sendWhatsAppOtp`; phone send accepts `phoneDelivery: "sms" | "whatsapp"` (confirm still uses the `sms` verification channel).
- `src/validators/customerAuth.ts` + `src/controllers/customerAuthController.ts`: `via` on phone send; `phone_channels` on verification status; `NOT_ON_WHATSAPP` when Meta/Twilio say the number is not on WhatsApp.
- `src/lib/env.ts`: `WHATSAPP_*` env fallback. `API.md` updated.

## 2026-10-15

### Optional Bangla version for products

- `prisma/schema.prisma` + migration `20261015150000_product_bangla`: nullable `name_bn`, `short_description_bn`, `description_bn` on `products`.
- `src/routes/dashboardProducts.ts`: create / update accept the three fields (safe text; `description_bn` goes through the same HTML sanitizer as `description`); `""`/`null` clears.
- `src/lib/productCatalog.ts`: `toPublicProduct` returns the product Bangla fields plus `category.name_bn`, `brand.name_bn`, `vendor.shop_name_bn`.
- `src/routes/publicProducts.ts`: search `q` also matches Bangla product, brand and category names.
- `API.md`: documented the new fields.

### Optional Bangla name / description for stores
- `prisma/schema.prisma` + `prisma/migrations/20261015140000_store_bangla/`: new nullable `vendors.shop_name_bn` (VARCHAR 200) and `description_bn` (TEXT). The slug stays shared.
- `src/routes/dashboardVendors.ts`: create and update accept `shop_name_bn` (≤200) and `description_bn` (≤5000), safe-input checked, with `""`/`null` clearing them. Changes are recorded in the store history, and the shop object includes both fields.
- `src/routes/publicShops.ts`: the store list and store detail include `shop_name_bn` / `description_bn`. The store page `brands[]` include `name_bn`.
- `API.md`: documented the new fields.

### Optional Bangla name / description for brands
- `prisma/schema.prisma` + `prisma/migrations/20261015130000_brand_bangla/`: new nullable `brands.name_bn` (VARCHAR 120) and `description_bn` (VARCHAR 500). The slug stays shared.
- `src/validators/brand.ts`: `name_bn` (≤120) and `description_bn` (≤500) are optional and safe-input checked. `""` or `null` clears them.
- `src/routes/dashboardBrands.ts`: create and update save both fields, and the brand object includes them.
- `src/routes/publicBrands.ts`: the brand list and brand detail include `name_bn` / `description_bn`.
- `src/routes/publicProducts.ts`: brand facets include `label_bn`.
- `API.md`: documented the new fields.

### Optional Bangla name / description for categories
- `prisma/schema.prisma` + `prisma/migrations/20261015120000_category_bangla/`: new nullable `categories.name_bn` (VARCHAR 150) and `description_bn` (TEXT). The slug stays shared by both languages.
- `src/validators/category.ts`: `name_bn` (≤150) and `description_bn` (≤5000) are optional and safe-input checked. `""` or `null` clears them.
- `src/routes/dashboardCategories.ts`: create and update save both fields, and every category response includes them.
- `src/routes/publicCategories.ts`: `name_bn` on root and child categories.
- `src/routes/publicProducts.ts`: category facets include `label_bn`.
- `API.md`: documented the new fields.

### Image dimension rule on dashboard uploads
- `src/lib/imageOptimize.ts`: new `checkImageDimensions(buffer, preset)`.
  - It reads the size with sharp, after applying EXIF rotation.
  - Rejects images whose shape is more than 3% off the preset's (`IMAGE_WRONG_RATIO`) and images smaller than the preset (`IMAGE_TOO_SMALL`), with a message that gives the actual and required pixels.
  - Avatars, review photos and `homeGeneric` are exempt.
  - Also adds `formatRatio()`.
- Where the check runs: `optimizeStoredUpload`, `src/lib/categoryImage.ts` (`finalizeCategoryImageBuffer`) and `src/lib/productImage.ts`, all before resizing.
- Endpoints covered: products, categories, brands, stores (logo and banner), store/brand page media, SEO / site identity images, home hero and home blocks.
- Category ZIP import reports a bad image as a row warning, as before.
- `API.md`: new "Image dimensions" section with the preset table and error codes.

### Remove a category cover photo
- `src/routes/dashboardCategories.ts`: new `DELETE /:id/image` for elevated roles. It clears `image_id` and deletes the media row and file, so the category falls back to its icon. The update only applies if the current `image_id` still matches; otherwise it returns `409 CATEGORY_IMAGE_CHANGED`.
- `API.md`: documented the endpoint.

### Health check hardening
- `src/routes/health.ts`: same path and response shape (Docker `HEALTHCHECK` still works), but the DB ping is shared for 5 s across requests, times out after 3 s (→ `503 degraded`), and responses send `Cache-Control: no-store`. Stops a public endpoint from turning every poll into a DB query.
- `API.md`: corrected the documented response (`service: "backend"`, `database: "connected"`) and noted the cache / timeout.

### Security fixes (BE-01, BE-02, BE-03, BE-05, BE-24)
- `src/lib/coupons.ts` (new), `src/validators/order.ts`, `src/routes/customerOrders.ts`: checkout no longer accepts `discount_amount`; it takes `coupon_code` and computes the discount on the server (unknown code → `400 COUPON_INVALID`). New `POST /api/customer/orders/coupon` (rate limit 20 / 10 min per IP) lets the storefront preview a code.
- `src/lib/env.ts`, `.env.example`: production exits at startup unless `JWT_SECRET` and `SETTINGS_ENCRYPTION_KEY` are each 32+ bytes; the encryption key falls back to `JWT_SECRET` only in development. Existing deployments that never set `SETTINGS_ENCRYPTION_KEY` should set it to the current `JWT_SECRET` to keep stored provider secrets readable.
- `src/server.ts`: imports `express-async-errors` so rejected async handlers reach the error middleware instead of crashing Node; logs `unhandledRejection`.
- `src/utils/ids.ts` (new) `parseBigIntId` (1–19 digits, ≤ max BIGINT) used in `publicProducts.ts` (`GET /api/products/:idOrSlug`), the `parseId` helpers in `dashboardProducts.ts` / `dashboardCategories.ts` / `dashboardVendors.ts` / `dashboardBrands.ts`, and the `:id` routes in `dashboardSiteSettings.ts` and `dashboardNotifications.ts`.
- `package.json`: `sharp@^0.35.5`, added `express-async-errors`. Root `package.json` `pnpm.overrides` pins `proxy-addr >=2.0.8`, `qs >=6.16.0`, `sharp >=0.35.5`, `source-map-js >=1.2.2`, `shell-quote >=1.11.0`.
- `API.md`: documented `coupon_code`, `COUPON_INVALID`, the coupon endpoint, and the production secret requirement. `SECURITY_AUDIT.md` + root index updated.

### Security re-audit
- `SECURITY_AUDIT.md`: re-checked BE-01 – BE-23 against the code; all still open. Added BE-24 (`proxy-addr` / `qs` via Express) and BE-25 (`deepmerge-ts` via Prisma) from `pnpm audit`. Root `SECURITY_AUDIT.md` counts updated. No code changed.

### Category export / import with cover images
- `src/routes/dashboardCategoriesBulk.ts` (new, mounted inside `dashboardCategories.ts` before `/:id`): `GET /export?format=zip|csv` (ZIP = `categories.csv` + `images/<slug>.<ext>`; CSV = image URLs), `GET /import-template`, `POST /import` (multipart `file` .csv ≤2 MB or .zip ≤25 MB, `mode`, `dry_run` default true). Elevated roles only via `categoryBulkPermissions(role)`; the list response now includes `permissions`.
- `src/services/categoryImport.ts` (new): validates every row, resolves parents by handle (including rows in the same file, cascading missing parents, rejecting loops), rejects handles held by soft-deleted categories, writes rows in one transaction, then stores covers. Images come from the ZIP or from this API's own `/uploads/` URLs; other hosts are never fetched. Unchanged covers are skipped.
- `src/lib/categoryCsv.ts` (new): columns + header aliases, CSV / ZIP reader, image reference classification with path-traversal checks.
- `src/lib/zipArchive.ts` (new): minimal ZIP reader using `zlib.inflateRawSync` with `maxOutputLength` per entry (zip-bomb safe); rejects ZIP64, encrypted entries and unsafe paths.
- `src/lib/categoryImage.ts`: new `finalizeCategoryImageBuffer()` / `checkCategoryImageBuffer()`; the file-based finalize now delegates to the buffer one (same sniff → resize → post-resize size check).
- `src/lib/productCsv.ts`: extracted `decodeCsvText()` and exported `unguard()` for reuse.
- `src/validators/categoryBulk.ts` (new): export query, import options and per-column cell schemas (safe input on every string, icon must be in the catalog).
- `package.json`: added `fflate` (ZIP writing for exports).
- `API.md`: category export / import section and multipart cheat-sheet row.

### Product CSV export / import and bulk edit
- `src/routes/dashboardProductsBulk.ts` (new, mounted inside `dashboardProducts.ts` before `/:id`): `GET /export` (CSV, filters or `ids`, ≤5,000 rows), `GET /import-template`, `POST /import` (multipart `file`, `dry_run` preview by default, `mode` upsert/create/update), `POST /bulk` (status, category, brand, featured, price set/±%/±৳, compare-at, stock set/±, shipping fee) and `POST /bulk-delete` (soft delete). `productBulkPermissions(role)` holds the role matrix: super_admin/admin everything across stores; moderator export + bulk edit of status/category/brand/featured only; vendor export/import/bulk edit scoped to their own store; bulk delete super_admin/admin only. Denials are 403 `INSUFFICIENT_ROLE`.
- `src/services/productImport.ts` (new): validates every row, batch-looks-up handles, categories, brands, stores and SKUs, flags in-file duplicates, then previews or writes. New rows create a simple product + default variant in one transaction; updates touch only columns present in the file and keep the default variant in sync. Variable products only get non-variant fields. Repeated handles (Shopify variant / image rows) are skipped.
- `src/lib/productCsv.ts` (new): RFC 4180 parser, Shopify / WooCommerce header aliases, formula-injection guard on export (stripped again on import), UTF-8 / binary / HTML / PHP payload checks, size and row limits.
- `src/validators/productBulk.ts` (new): Zod schemas for bulk ids, changes, export query, import options and per-column CSV cells (all text through `withSafeInput`; description through the product HTML sanitizer).
- `src/routes/dashboardProducts.ts`: list response now includes `permissions` for the caller.
- `API.md`: documented the endpoints, role matrix, CSV columns, import rules and the `file` multipart field.

## 2026-10-08

### Dynamic shop price range
- `src/routes/publicProducts.ts`: new `GET /api/products/price-range?q=&category=&brands=a,b` → `{ min, max, count }` (Zod + safe-input, slug regex, ≤ 20 brands, wrapped in `asyncHandler`, registered before `/:idOrSlug`). Filter logic moved into a shared `catalogWhere()`; `facets.price` on `GET /api/products` is now scoped to the same `q` / `category` / `brand` filters instead of the whole catalog.
- `API.md`: documented the endpoint and the `facets.price` change.
- `SECURITY_AUDIT.md` (+ root index): logged BE-23, `cost_price` exposed by `toPublicProduct`.

### Security audit
- `SECURITY_AUDIT.md`: new findings tracker (BE-01 – BE-22) from `npm audit` + code review; rolled up in the root `SECURITY_AUDIT.md`. No code changed.
- `AGENTS.md`: points to the audit file.

## 2026-10-01

### Richer dashboard overview analytics

- `src/routes/dashboardOverview.ts`: `GET /api/dashboard/overview` accepts `?range=7|30|90` and now returns KPIs with previous-period change (revenue, orders, AOV, visitors, page views, conversion, new customers), a daily timeseries, orders by status, payment methods, devices, top pages / referrers / products, sales by category, catalog status, low-stock products, recent orders and every visitor country (for the world map). Existing `stats` keys kept.
- `src/validators/overview.ts`: Zod schema for `range`.
- `API.md`: documented the new response.

### FAQ & Terms content pages

- `prisma/schema.prisma` + migration `20261001120000_content_pages`: new `ContentPage` model (`content_pages`, one row per `page_key`, JSON `content`, SEO fields, publish / noindex flags).
- `src/validators/contentPage.ts`: Zod schemas for FAQ (hero, layout, categories → items, help box) and Terms (hero, effective date, intro, sections, help box); unique slug ids, safe-input on every string.
- `src/lib/contentPages.ts`: built-in default FAQ and Terms copy (served while no row exists), `toContentPage()` / `toPublicContentPage()` (hides disabled items).
- `src/routes/publicPages.ts`: `GET /api/pages/:key` (404 when unpublished).
- `src/routes/dashboardPages.ts`: `GET` / `PATCH` / `DELETE` (reset to default) `/api/dashboard/pages/:key` for super_admin + admin; history logged, frontend revalidated with `pages` / `page:<key>` tags.
- `src/server.ts`: mounted both routers. `API.md`: documented the endpoints.

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
