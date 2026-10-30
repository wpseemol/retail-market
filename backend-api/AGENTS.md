# backend-api — agent guide

Express + Prisma 6 + MySQL REST API for the Niyenin retail market. Serves the
storefront (`frontend/`, port 3000) and the admin dashboard (`dashboard/`, port 4173).

- **Port:** 8001 (`PORT` in `backend-api/.env`). Current production is a Spaceship Node.js app (Passenger, startup file `dist/server.js`); steps are in [`../DEPLOY.md`](../DEPLOY.md). `docker-compose.prod.yml` stays for a later VPS.
- **Package name:** `backend-api` (pnpm workspace member)
- **Public API reference:** [`API.md`](./API.md) — update it whenever an endpoint changes.
- **Change log:** [`CHANGELOG.md`](./CHANGELOG.md) — append every change you make here.
- **Security audit:** [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) — mark items `Fixed YYYY-MM-DD` when resolved and update the root [`../SECURITY_AUDIT.md`](../SECURITY_AUDIT.md) counts.

## Scripts

Run from `backend-api/` (or `pnpm --filter backend-api <script>` from the root):

| Script | What it does |
| --- | --- |
| `dev` | `tsx watch src/server.ts` |
| `build` | `prisma generate && tsc` |
| `start` | `node dist/server.js` |
| `type-check` | `tsc --noEmit` |
| `db:generate` | `prisma generate` (stop the dev server first on Windows — the query engine DLL is locked) |
| `db:migrate` / `db:push` / `db:seed` / `db:studio` | Prisma helpers |
| `images:optimize` | `scripts/optimize-images.ts` — re-encodes stored media, keeps originals, `--prune-orphans` optional |

## Folder structure

```
backend-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/<timestamp>_<name>/migration.sql
├── scripts/optimize-images.ts
├── uploads/                 # local driver only (gitignored). Empty when STORAGE_DRIVER=s3
└── src/
    ├── config/storage.config.ts  # STORAGE_DRIVER + S3_* validation
    ├── server.ts            # express app, cors, route mounting
    ├── routes/              # public*, customer*, dashboard*, payments, health
    ├── controllers/
    ├── services/
    ├── middleware/          # auth (Bearer), requireRoles, upload (multer)
    ├── validators/          # Zod schemas per domain (order.ts, cart.ts, ...)
    ├── lib/                 # env, prisma, cart, sslcommerz, image helpers, productReviews,
    │                        # reviewImage, rateLimit + kvStore (memory or Redis via REDIS_URL),
    │                        # responseCache (short public GET JSON), showcase (store/brand page
    │                        # JSON), showcaseMedia (banner / share image finalize), revalidate,
    │                        # contentPages (FAQ / Terms defaults + public shaping),
    │                        # productCsv (product CSV parse / export, header aliases, limits),
    │                        # categoryCsv (category CSV / ZIP import file, image refs),
    │                        # zipArchive (size-capped ZIP reader for imports),
    │                        # smsGateway + whatsappGateway (OTP delivery, encrypted credentials),
    │                        # storage/files.ts (local disk or S3/MinIO/R2 put, delete, read, presign)
    ├── utils/
    └── data/
```

## Conventions

- **Validation:** every mutating/list route parses body and query with a Zod schema from `src/validators/`. Wrap user strings with `withSafeInput` / `findUnsafeInputReason` (SQL, PHP, JS, HTML payloads are rejected).
- **Async handlers & ids:** `express-async-errors` (imported in `server.ts`) forwards rejected async handlers to the error middleware; `asyncHandler` is still fine to use. Parse numeric route ids with `parseBigIntId` from `src/utils/ids.ts` (never raw `BigInt(req.params.id)` — oversized ids make Prisma throw).
- **Secrets:** with `NODE_ENV=production` the API refuses to start unless `JWT_SECRET` and `SETTINGS_ENCRYPTION_KEY` are each 32+ bytes.
- **Pricing:** discounts come only from `coupon_code` via `src/lib/coupons.ts`; never accept a client-sent amount.
- **Errors:** respond `{ message, code?, errors? }`. Use 409 with a stable `code` for state conflicts (e.g. `ORDER_NOT_DELETABLE`, `ORDER_CHANGED`).
- **Auth:** protected routes require `Authorization: Bearer <token>`. Dashboard catalog mutations require `super_admin | admin | moderator`; order deletion is `super_admin | admin` only.
- **Reviews:** `ProductReview` (`product_reviews`) is the purchase-verified review model; the older `Review` model is unused legacy. Review eligibility = a `delivered` + `paid` order matching the email/phone/user that contains the product. Vendors are scoped to their own shop's products.
- **Showcase & SEO:** store (`Vendor`) and brand pages store their design in the `showcase` JSON column — always read it through `normalizeShowcase()` in `src/lib/showcase.ts`. Global SEO lives on `SiteSettings` and is edited only via `/api/dashboard/seo` (super_admin + admin). A brand's `vendor_id` (set by super_admin/admin) lets that store's vendor edit the brand page, never its name/slug/active state. Admins may override any store's page design but cannot create, delete or re-configure stores.
- **Content pages (FAQ, Terms):** one `ContentPage` row per `page_key` with JSON `content`, validated per key by `contentSchemaByKey` in `src/validators/contentPage.ts`. No row = built-in defaults from `src/lib/contentPages.ts`; `DELETE /api/dashboard/pages/:key` resets by removing the row. Editing is super_admin + admin. Add a new page by extending `CONTENT_PAGE_KEYS`, its schema, and its defaults. Default copy must pass `withSafeInput` (avoid phrases like "delete from" or "select … from").
- **Product bulk tools:** export / import / bulk edit / bulk delete live in `routes/dashboardProductsBulk.ts` (mounted inside `dashboardProducts.ts` before `/:id`) with the import logic in `services/productImport.ts`. The role matrix is `productBulkPermissions(role)` — the list endpoint returns it as `permissions`, so change it there rather than adding role checks in the UI. Imports are dry-run by default; keep `lib/productCsv.ts` limits in sync with `dashboard/src/lib/validators/productBulk.ts`.
- **Category export / import:** `routes/dashboardCategoriesBulk.ts` + `services/categoryImport.ts`, elevated roles only (`categoryBulkPermissions`). ZIP exports carry covers under `images/`; imports read images from the ZIP or this API's own `/uploads/` URLs only — never fetch other hosts. Read uploaded ZIPs with `lib/zipArchive.ts` (per-entry output cap), not an unbounded unzip. Images go through `finalizeCategoryImageBuffer`. Keep limits in sync with `dashboard/src/lib/validators/categoryBulk.ts`.
- **Bangla content:** `Category` (`name_bn`, `description_bn`), `Brand` (`name_bn`, `description_bn`), `Vendor` (`shop_name_bn`, `description_bn`) and `Product` (`name_bn`, `short_description_bn`, `description_bn` — sanitized HTML like `description`) have optional nullable Bangla copy. The slug is shared, so never add a `slug_bn`. Validate with `withSafeInput`, turn `""` into `null`, and return the fields on both dashboard and public responses; the storefront falls back to English.
- **Storefront cache:** after any write that changes public pages, call `revalidateFrontend([...tags])` from `src/lib/revalidate.ts` (needs `REVALIDATE_SECRET` + `FRONTEND_URL`; silently skipped when unset). Tags: `stores`, `store:<slug>`, `brands`, `brand:<slug>`, `reviews`, `site-settings`, `pages`, `page:<key>`.
- **Uploads:** sniff MIME by magic bytes, enforce multer size limit, check dimensions with `checkImageDimensions(buffer, preset)`, always resize with sharp, re-check size after resize, sanitize original filenames. `STORAGE_DRIVER=s3` keeps the multer file in memory and streams the resized buffer to object storage (`src/lib/storage/files.ts`); `medias.disk` is `s3` or `r2`. `local` still writes `uploads/` and uses `disk: public`.
  - The dimension rule: shape within 3% of the preset and at least the preset size. Exempt: avatars, reviews, `homeGeneric`.
  - Keep `IMAGE_PRESETS` in sync with `dashboard/src/lib/imagePresets.ts`. Document field names and limits in `API.md`.
- **Migrations:** add a new folder under `prisma/migrations/` (never edit an applied one). Backfill data in the same SQL when adding non-null columns.
- **Concurrency:** guard state-changing writes with the expected current state in the `where` clause (`updateMany` / `deleteMany`) and return 409 when nothing matched.
- **CORS:** custom response headers the dashboard reads (`Content-Disposition`, `X-Total-Rows`) must be listed in `exposedHeaders` in `server.ts`.
- **App keys:** `requireAppKeys` blocks every `/api` route except `GET /api/health` and the SSLCOMMERZ success, fail, cancel, and IPN callbacks. Callers send `X-Public-Key` and `X-Api-Secret`. `/uploads` stays public. Production will not start unless both keys are at least 32 bytes.
- **Rate limits & cache:** `src/lib/kvStore.ts` is memory when `REDIS_URL` is empty (Spaceship), Redis when set. `rateLimit` and `cacheJsonGet` both use it. Global `/api` limit skips health + SSLCOMMERZ callbacks. Public GETs for home hero, site-settings, categories, and brands list cache ~45 s; `revalidateFrontend` also clears those keys.
- **Env files:** `.env.dev` locally, `.env.prod` when `NODE_ENV=production`. `.env` stays a copy of `.env.dev` because Prisma reads that name. `index.html` and `.htaccess` are what the host serves when Passenger is stopped, so the folder listing and the env files are not public.

## Workspace rules

See `../.cursor/rules/`:
- `form-upload-security.mdc` — forms, Zod, safe input, uploads, resize
- `confirm-destructive-actions.mdc` — destructive actions need a confirm step in the UI
- `changelog-tracking.mdc` — log every change in this app's `CHANGELOG.md`

## Docker

`backend-api/Dockerfile`; the compose service is still named `backend` because the
frontend uses `INTERNAL_API_URL=http://backend:8001`.
