# Retail Market — Backend API

> **Audience:** Frontend developers, Cursor, Claude, Gemini, and other coding agents.  
> **Base URL (local):** `http://localhost:8001`  
> **Source of truth:** Express routes under `backend/src/routes/` mounted in `backend/src/server.ts`.

Use this file when building dashboard or storefront clients. Prefer exact paths, field names, and roles from this document.

---

## Quick start

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

| Item | Value |
|------|--------|
| Default port | `8001` (`PORT` env) |
| Auth header | `Authorization: Bearer <accessToken>` |
| Login returns | `accessToken`, `refreshToken`, and deprecated `token` (= access) |
| Uploads public URL | `{PUBLIC_API_URL}/uploads/{file_path}/{file_name}` |
| CORS (default) | `http://localhost:3000`, `http://localhost:5173` |

### Roles

| Role | App |
|------|-----|
| `customer` | Storefront (`/api/auth`, `/api/customer/*`) |
| `super_admin`, `admin`, `moderator`, `vendor` | Dashboard (`/api/dashboard/*`) |

**Elevated staff** (mutate catalog): `super_admin` \| `admin` \| `moderator`  
**STAFF** (dashboard login): elevated + `vendor`

### Common error shape

```json
{ "message": "Human-readable reason" }
```

Optional extras:

```json
{ "message": "...", "errors": { "field": ["..."] }, "code": "MACHINE_CODE" }
```

| Status | Meaning |
|--------|---------|
| 400 | Validation / bad input / upload |
| 401 | Missing/invalid token or credentials |
| 403 | Wrong role or inactive account |
| 404 | Not found |
| 409 | Unique conflict (slug, email, …) |
| 500 | Internal error |

### Security (all string bodies)

String fields are checked for SQL-like payloads, PHP tags/code, JavaScript (`eval`, `Function`, `document.cookie`, …), HTML/script tags, and `javascript:` / `on*=` handlers. Rejected with a clear `message`.

---

## Router map

| Prefix | File | Who |
|--------|------|-----|
| `/api/health` | `routes/health.ts` | Public |
| `/api/auth` | `routes/customerAuth.ts` | Customers |
| `/api/customer/addresses` | `routes/customerAddresses.ts` | Customers |
| `/api/customer/orders` | `routes/customerOrders.ts` | Guests (POST) + customers |
| `/api/customer/wishlist` | `routes/customerWishlist.ts` | Customers only |
| `/api/payments` | `routes/payments.ts` | SSLCOMMERZ callbacks (gateway) + retry (guest/customer) |
| `/api/site-settings` | `routes/publicSiteSettings.ts` | Public |
| `/api/analytics` | `routes/publicAnalytics.ts` | Public |
| `/api/shops` | `routes/publicShops.ts` | Public |
| `/api/products` | `routes/publicProducts.ts` | Public |
| `/api/categories` | `routes/publicCategories.ts` | Public |
| `/api/search` | `routes/publicSearch.ts` | Public |
| `/api/home` | `routes/publicHome.ts` | Public |
| `/api/dashboard/auth` | `routes/dashboardAuth.ts` | Staff |
| `/api/dashboard/users` | `routes/dashboardUsers.ts` | `super_admin` |
| `/api/dashboard/overview` | `routes/dashboardOverview.ts` | `super_admin`, `admin` |
| `/api/dashboard/notifications` | `routes/dashboardNotifications.ts` | Staff |
| `/api/dashboard/orders` | `routes/dashboardOrders.ts` | Staff |
| `/api/dashboard/site-settings` | `routes/dashboardSiteSettings.ts` | `super_admin` |
| `/api/dashboard/home-hero` | `routes/dashboardHomeHero.ts` | `super_admin` |
| `/api/dashboard/home-blocks` | `routes/dashboardHomeBlocks.ts` | `super_admin` |
| `/api/dashboard/shops` | `routes/dashboardVendors.ts` | `super_admin`, `vendor` |
| `/api/dashboard/categories` | `routes/dashboardCategories.ts` | Staff |
| `/api/dashboard/brands` | `routes/dashboardBrands.ts` | Staff |
| `/api/dashboard/products` | `routes/dashboardProducts.ts` | Staff |

Static files: `GET /uploads/*`

---

## Health

### `GET /api/health`

No auth.

**200**

```json
{ "status": "ok", "service": "retail-market-api", "database": "up", "timestamp": "..." }
```

**503** if DB down: `"status": "degraded"`.

---

## Public analytics — `/api/analytics`

`POST /api/analytics/visit` — no auth. Storefront beacon for visitor-by-country.

```json
{ "path": "/", "referrer": "" }
```

Resolves country from IP (`geoip-lite`). Private IPs → `LO` (Local network).

---

## Public stores — `/api/shops`

No auth. Active stores only (dashboard create/edit stays on `/api/dashboard/shops`).

### `GET /api/shops`

Query: `page` (default 1), `limit` (default 24, max 48), `q?` (search name/slug/description).

**200** → `{ stores, pagination }`

`stores[]`: `id`, `shop_name`, `slug`, `description`, `logo`, `banner`, storefront layout fields, `products_count`

### `GET /api/shops/:slug`

Query: `page` (default 1), `limit?` (falls back to store `products_per_page`, max 48).

**200** → `{ store, products, featured_products, pagination }`

`store` includes: `logo`, `banner`, `storefront_theme` (`classic`|`marketplace`|`showcase`), `products_per_page`, `featured_products_count`, `show_banned_brands`, `product_sort`  
`products[]` include `brand_banned` when linked brand is inactive  
`featured_products`: featured slice for showcase layouts

**404** if slug missing or store not active.

Dashboard customize: `PATCH /api/dashboard/shops/:idOrSlug` + `POST /:idOrSlug/banner` (multipart field **`banner`** · max **5 MB** · resized). Id or **slug** accepted.

---

---

## Public categories — `/api/categories`

No auth. Active root categories with nested children for the storefront header mega-menu.

`GET /api/categories` → `{ categories: [{ id, name, slug, icon, image, products_count, children: [{ id, name, slug, products_count }] }] }`

---

## Public home — `/api/home`

No auth. Used by the storefront home page (SSR fetch + cache tags).

| Method | Path | Notes |
|--------|------|--------|
| GET | `/hero` | Singleton hero + side promo → `{ hero: { main, side, updated_at } }` |
| GET | `/blocks` | All CMS section JSON + hero → `{ blocks, hero }` (one round-trip) |

**`main`:** `eyebrow`, `headline`, `subtext`, `discount_percent`, `price_label`, `cta_label`, `cta_href`, `product_image`, `bg_image`  
**`side`:** `badge_label`, `offer_percent`, `offer_label`, `headline`, `discount_percent`, `cta_label`, `cta_href`, `product_image`, `bg_image`  

**`blocks` keys:** `welcome_modal`, `featured`, `deals_banner`, `product_groups`, `promo_slider`, `best_sellers`, `latest_products`, `deals_of_day`, `laptop_repair`, `top_brands` (seeded defaults; table `home_block_contents`).

Missing uploaded images → storefront falls back to built-in static art.

---

## Dashboard home hero — `/api/dashboard/home-hero`

Auth: Bearer **`super_admin`** only. Drives **Settings → Home → Hero banner**.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | Full hero for the editor |
| PATCH | `/` | Zod body · safe strings · optional discount percents (0–100) |
| POST | `/images/:slot` | Multipart field **`image`** · slots `main_product`\|`main_bg`\|`side_product`\|`side_bg` · max **1 MB** · always resized |

Table: `home_hero_banners` (id = 1).

---

## Dashboard home blocks — `/api/dashboard/home-blocks`

Auth: Bearer **`super_admin`**. Drives **Settings → Home → Other home sections**.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | `{ blocks, keys }` |
| GET | `/:key` | One block content |
| PATCH | `/:key` | Body `{ content: object }` · recursive safe-input · **`welcome_modal`** uses dedicated Zod schema |
| POST | `/:key/reset` | Restore seeded defaults |
| POST | `/:key/images` | Multipart field **`image`** · query/body **`field`** (dot path, e.g. `product_image` or `cards.0.image`) · max **1 MB** · always resized · writes URL into block JSON |

**Welcome modal fields:** `badge_label`, `eyebrow`, `headline_before`, `discount_percent` (0–100), `headline_after`, `body`, `cta_label`, `cta_href`, `dismiss_label`, `countdown_seconds` (5–120), `product_image`, `bg_image`.

Dashboard UI: **Settings → Home → Welcome modal** (shadcn Form + Zod · image preview + file upload).

---

## Public search — `/api/search`

No auth. Powers the storefront header live search (debounced 300 ms on the client).

`GET /api/search/suggest?q=&limit=`

| Query | Rules |
|-------|-------|
| `q` | Required · 2–80 chars · safe-input guarded (rejects HTML/JS/PHP/SQL payloads) |
| `limit` | Optional product count · 1–10 · default 6 |

Matches products (name, SKU, brand), categories (name, slug), and active shops (name, slug).

**200** → `{ q, products: [{ id, name, slug, price, thumbnail, category, shop }], product_total, categories: [{ id, name, slug, parent, products_count }], shops: [{ id, name, slug, logo, products_count }] }`

**400** → `{ message, code: "INVALID_SEARCH" }`

---

## Public products — `/api/products`

No auth. Active products only (inactive / draft stay dashboard-only).

### `GET /api/products`

Query: `page`, `limit` (max 48), `q?`, `category?` (slug), `brand?` (slug), `sort` (`default`|`price-asc`|`price-desc`|`name-asc`|`newest`).

**200** → `{ products, facets, pagination }`

`facets.categories` / `facets.brands`: `{ id, label, count }[]`  
`facets.price`: `{ min, max }`

### `GET /api/products/:idOrSlug`

Numeric id or product slug.

**200** → `{ product, related }`

`product`: public product detail + `gallery` media  
`related`: up to 8 active products from the same store (or category)

**404** if not found / not active.

---

## Dashboard overview — `/api/dashboard/overview`

Auth: Bearer **`super_admin`** or **`admin`**.

`GET /` → `{ overview: { stats, visitors_by_country, source, period_days } }`

`stats`: products, orders, staff_users, shops, visits_30d, visits_7d, sessions_30d  
`visitors_by_country`: `{ country, country_name, flag, visits, percent }[]`

---

## Customer auth — `/api/auth`

### `POST /api/auth/register`

```json
{
  "first_name": "Ada",
  "last_name": "Lovelace",
  "email": "ada@example.com",
  "password": "secret123",
  "phone": "+8801..."
}
```

**201/200:** `{ message, accessToken, refreshToken, token, sessionId, user, claimed_orders }`

`phone` is normalized to E.164 (`01712345678` → `+8801712345678`). Register, login and Google login all return `claimed_orders`: the number of guest orders attached to the account because its **verified** email or phone matched (see *Guest orders & verification* below).

### `POST /api/auth/login`

```json
{ "email": "ada@example.com", "password": "secret123" }
```

Staff accounts must use dashboard login (not this endpoint).

### `POST /api/auth/google`

```json
{ "idToken": "...", "accessToken": "..." }
```

At least one of `idToken` / `accessToken`. Client ID comes from dashboard **Social login** settings (falls back to `GOOGLE_CLIENT_ID` until Google is saved there). Disabled → 403 `PROVIDER_DISABLED`.

### `GET /api/auth/social-providers`

Public. Which social buttons to render — enabled flags + public client IDs only (never secrets). Cached 30 s.

```json
{ "providers": { "google": { "enabled": true, "client_id": "…apps.googleusercontent.com" }, "facebook": { "enabled": false, "client_id": null }, "apple": { "enabled": false, "client_id": null } } }
```

### `POST /api/auth/facebook`

```json
{ "accessToken": "EAAB…" }
```

Facebook JS SDK user token. Verified server-side with `debug_token` using the App ID + App Secret from dashboard settings. Needs the `email` permission (403 `FACEBOOK_EMAIL_REQUIRED` otherwise).

### `POST /api/auth/apple`

```json
{ "idToken": "eyJ…", "firstName": "Ada", "lastName": "Lovelace" }
```

Sign in with Apple `id_token` (RS256, Apple JWKS; `aud` must equal the Services ID). `firstName` / `lastName` are optional — Apple only sends the name on first consent.

All three share account resolution: linked provider → sign in; same verified email on a password account → link; email linked to another provider → 409 `LINKED_TO_OTHER_PROVIDER`; staff → 403 `STAFF_USE_DASHBOARD`; otherwise create customer. `login_method` on `user_sessions` records `google` / `facebook` / `apple`.

### `POST /api/auth/refresh`

```json
{ "refreshToken": "..." }
```

### `GET /api/auth/me` — Bearer customer

### `PATCH /api/auth/me` — Bearer customer

Optional: `first_name`, `last_name`, `phone`, `gender` (`male`\|`female`\|`other`), `date_of_birth` (`YYYY-MM-DD`).

Changing `phone` clears `phone_verified_at` (the new number must be verified again).

### `POST /api/auth/me/avatar` — Bearer customer

Multipart field: **`avatar`** · max **5 MB** · JPEG/PNG/WebP/GIF · always resized on the server.

### Guest orders & verification — Bearer customer

Guest orders are attached to an account **only** through a verified contact:
`email_verified_at` + matching `orders.customer_email`, or `phone_verified_at` + matching `orders.customer_phone`.
Matching is checked on register / login / Google login and right after a successful verification.
Google sign-in marks the email as verified automatically.

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/auth/me/verification` | — | `{ email, email_verified, phone, phone_verified, pending_guest_orders: { email, phone } }` |
| POST | `/api/auth/me/verify/email/send` | — | `{ message, expires_in, resend_in }` |
| POST | `/api/auth/me/verify/email/confirm` | `{ "code": "123456" }` | `{ message, user, claimed_orders }` |
| POST | `/api/auth/me/verify/phone/send` | `{ "phone"?: "01712345678" }` | `{ message, phone, expires_in, resend_in }` |
| POST | `/api/auth/me/verify/phone/confirm` | `{ "code": "123456" }` | `{ message, user, claimed_orders }` |

- Codes: 6 digits, stored hashed (HMAC-SHA256), valid **10 min**, max **5** wrong attempts.
- Resend cooldown **60 s** per channel (`429 RESEND_TOO_SOON`, `retry_after`); max **5** codes per target per hour (`429 TOO_MANY_CODES`).
- `phone/send` without `phone` uses the profile number; with `phone`, the number is saved to the profile only after the code is confirmed (`409 PHONE_IN_USE` if another account owns it).
- Error codes: `ALREADY_VERIFIED`, `PHONE_REQUIRED`, `CODE_EXPIRED`, `INVALID_CODE` (+ `attempts_left`), `TOO_MANY_ATTEMPTS`, `SEND_FAILED`, `TARGET_CHANGED`.
- Delivery: `SMTP_*` env for email, `SMS_PROVIDER=bulksmsbd` + `SMS_API_KEY` + `SMS_SENDER_ID` for SMS. In development without config, codes are logged to the backend console; in production a missing config returns `502 SEND_FAILED`.

---

## Customer addresses — `/api/customer/addresses`

Auth: Bearer **`customer`**.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | `{ addresses: [...] }` |
| POST | `/` | Create |
| PATCH | `/:id` | Partial update |
| DELETE | `/:id` | Soft-delete |

**Body (create):**

| Field | Required | Notes |
|-------|----------|--------|
| `full_name` | yes | |
| `phone` | yes | |
| `line1` | yes | |
| `city` | yes | |
| `postal_code` | yes | |
| `label` | no | |
| `line2` | no | |
| `state` | no | |
| `country` | no | 2-letter, default `BD` |
| `type` | no | `shipping` \| `billing` \| `both` |
| `is_default_shipping` | no | boolean |
| `is_default_billing` | no | boolean |

---

## Customer orders — `/api/customer/orders`

Placing an order creates inbox notifications for `super_admin` / `admin` / `moderator`, plus vendors whose products are in the cart.

### `POST /api/customer/orders` — guest **or** Bearer customer

- **No `Authorization` header → guest checkout.** `email` is required; the order is stored with `user_id = null`, `customer_email`, and `customer_phone` (normalized billing phone).
- **Bearer customer →** linked to the account; `email` defaults to the account email.
- An invalid/expired Bearer token returns `401` (it does not fall back to guest). Staff tokens return `403 STAFF_CANNOT_ORDER`.
- `billing.phone` / `shipping.phone` must be a valid mobile number and are normalized to E.164 (`+8801712345678`).

```json
{
  "email": "ada@example.com",
  "items": [
    { "product_id": "12", "name": "Widget", "unit_price": 500, "quantity": 2 }
  ],
  "billing": {
    "full_name": "Ada Lovelace",
    "phone": "01700000000",
    "line1": "12 Road",
    "city": "Dhaka",
    "postal_code": "1200",
    "country": "Bangladesh"
  },
  "payment_method": "cash_on_delivery",
  "notes": "",
  "discount_amount": 0
}
```

`shipping_fee` in the body is **ignored** — shipping is always calculated on the server (see shipping rule below).

`payment_method`: `sslcommerz` (bKash, Nagad, Rocket, cards via SSLCOMMERZ) | `cash_on_delivery`. Anything else → `400`.

**201** → `{ message, order: { id, order_number, total, …, is_guest }, payment? }`

**Online payment (`payment_method: "sslcommerz"`)**

- Rejected **before** the order is created with `400 GATEWAY_NOT_CONFIGURED` (no `SSLCZ_STORE_ID`) or `400 AMOUNT_OUT_OF_RANGE` (total must be ৳10 – ৳500,000).
- On success the response includes `payment: { gateway_url }` → redirect the browser there (SSLCOMMERZ hosted page: bKash, Nagad, Rocket, cards, net banking).
- If the gateway session could not be opened, the order still exists (unpaid) and the response has `payment: { gateway_url: null, error, code }` → send the user to `/checkout/result?status=failed` where they can retry.
- The order stays `payment_status: "unpaid"` until the payment is validated server-side (see [Payments](#payments--apipayments)).

### `POST /api/customer/orders/shipping-quote` — no auth

Body `{ items: [{ product_id, unit_price, quantity }] }` (max 50 items). Uses the same calculation as placing an order.

**200** → `{ shipping_fee, free_shipping_applied, default_fee, free_threshold, vendor_override }`

**Shipping rule**

- Each product's fee is its own `shipping_fee`, or the site `default_fee` when the product's value is `null`. `0` = free for that product.
- Items are grouped by store (`vendor_id`); each store charges the **highest** product fee in its group. The order fee is the sum across stores.
- If `free_threshold` is set and the items subtotal (before discount) is at or above it, the whole order ships free.

### `GET /api/customer/orders` — Bearer customer

Query: `page` (default 1), `limit` (1–50, default 10). Includes guest orders claimed after verification (`claimed_at` set).

**200** → `{ orders: [{ id, order_number, status, payment_status, payment_method, currency, total, placed_at, claimed_at, item_count, items[] }], pagination }`

---

## Customer wishlist — `/api/customer/wishlist`

Bearer **customer** only (guests get `401` → storefront sends them to `/login?next=…` and saves the product after sign-in). Only active products from active shops are listed / addable; products that later become hidden are skipped (not deleted). Max **200** items.

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/` | — | `{ items: [{ added_at, product }], count }` — `product` = public product object, newest first |
| `GET` | `/ids` | — | `{ product_ids: string[], count }` — for heart-button state |
| `POST` | `/` | `{ "product_id": "24" }` | `201` (new) / `200` (already saved) → `{ message, product_ids, count }` |
| `DELETE` | `/:productId` | — | `{ message, product_ids, count }` (idempotent) |

Errors: `400` validation (`product_id` must be a numeric id), `404 PRODUCT_NOT_FOUND` (missing / inactive product), `400 WISHLIST_FULL`.

---

## Payments — `/api/payments`

SSLCOMMERZ hosted checkout (`lib/sslcommerz.ts`). Env: `SSLCZ_STORE_ID`, `SSLCZ_STORE_PASSWORD`, `SSLCZ_IS_LIVE` (`true` → `securepay.sslcommerz.com`, else sandbox), `PUBLIC_API_URL` (callback base, must be publicly reachable for IPN), `FRONTEND_URL` (result redirect).

Every attempt creates a new `payments` row (`provider: "sslcommerz"`, `transaction_id` = `{order_number}-{8 hex}`, max 30 chars). A payment is **only** marked paid after the server calls the SSLCOMMERZ validation API and checks `status ∈ {VALID, VALIDATED}`, matching `tran_id`, `currency_amount` and `currency_type` (BDT). `risk_level = 1` → payment `under_review`, order stays unpaid for manual review. Settling is idempotent (callback + IPN may both arrive). Paid → order `payment_status: "paid"`, `status: pending → confirmed`.

The callback routes are called by the **gateway / customer browser**, not by your frontend code. Body: `application/x-www-form-urlencoded` (`tran_id`, `val_id`, `status`, `error`, … — extra fields ignored).

| Method | Path | Behaviour |
|--------|------|-----------|
| `POST` | `/sslcommerz/success` | Validates + settles, then `303` → `{FRONTEND_URL}/checkout/result?status=success\|review\|failed&order=…` |
| `POST` | `/sslcommerz/fail` | Marks attempt failed → `303 …?status=failed&order=…` |
| `POST` | `/sslcommerz/cancel` | Marks attempt failed → `303 …?status=cancelled&order=…` |
| `POST` | `/sslcommerz/ipn` | Server-to-server; validates + settles (or marks unpaid). Responds `200 OK` (`400 INVALID` on malformed body). |

### `POST /api/payments/sslcommerz/retry` — guest **or** Bearer customer

Start a new payment attempt for an unpaid online order (after fail / cancel).

```json
{ "order_number": "NIY-20260929-4821", "email": "ada@example.com" }
```

- `email` is required for guests (must equal the order's `customer_email`); logged-in owners may omit it.
- **200** → `{ gateway_url, order_number }`
- **404 `ORDER_NOT_FOUND`** — no match (same response for "wrong email" to avoid leaking orders).
- **400** `ALREADY_PAID` | `ORDER_CLOSED` | `AMOUNT_OUT_OF_RANGE` | `ADDRESS_MISSING` | `GATEWAY_NOT_CONFIGURED`; **502** `GATEWAY_INIT_FAILED`.

---

## Dashboard notifications — `/api/dashboard/notifications`

Auth: Bearer **staff**. Each staff user only sees their own inbox. Unread count drives the header bell badge; remove or mark-read decreases it.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/unread-count` | `{ unread_count }` |
| GET | `/?page=&limit=&unread=` | List + `unread_count` |
| POST | `/read-all` | Mark all read |
| PATCH | `/:id/read` | Mark one read |
| DELETE | `/:id` | Remove (badge decreases if unread) |

Notification `data.link` is a dashboard path (e.g. `/orders/12`).

---

## Dashboard orders — `/api/dashboard/orders`

Auth: Bearer **staff**. Vendors only see orders that include their products.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/?page=&limit=&status=` | List |
| GET | `/:id` | Detail + addresses |

Each order includes `is_guest`, `claimed_at`, and `customer: { id | null, name, email, phone }` — for guest orders `id` is `null`, `name` comes from the billing address and `email`/`phone` from checkout.

---

## Dashboard auth — `/api/dashboard/auth`

### `POST /api/dashboard/auth/login`

```json
{ "identifier": "admin@example.com", "password": "..." }
```

`identifier` may be email, phone, or username. Legacy keys `email` / `phone` / `username` also accepted.

**Response:** `{ message, accessToken, refreshToken, token, sessionId, home, user }`

| Role | `home` |
|------|--------|
| `super_admin` | `/super-admin` |
| `admin` | `/admin` |
| `moderator` | `/moderator` |
| `vendor` | `/vendor` |

### `POST /api/dashboard/auth/refresh`

```json
{ "refreshToken": "..." }
```

### `GET /api/dashboard/auth/me` — STAFF

`{ user, home }`

### `PATCH /api/dashboard/auth/me` — STAFF

`first_name?`, `last_name?`, `username?`, `phone?`, `avatar_preset?` (allowlisted SVG key or `null`)

Setting `avatar_preset` clears the uploaded photo (`avatar_id`).

### `POST /api/dashboard/auth/me/avatar` — STAFF

Multipart field **`avatar`** · max **5 MB** · JPEG/PNG/WebP/GIF. Clears `avatar_preset`.

### `POST /api/dashboard/auth/change-password` — STAFF

```json
{
  "current_password": "...",
  "new_password": "...",
  "confirm_password": "..."
}
```

### Workspace gates

| Path | Roles |
|------|--------|
| `GET /api/dashboard/auth/workspace/super-admin` | `super_admin` |
| `GET /api/dashboard/auth/workspace/admin` | `admin`, `super_admin` |
| `GET /api/dashboard/auth/workspace/moderator` | `moderator`, `super_admin` |
| `GET /api/dashboard/auth/workspace/vendor` | `vendor`, `super_admin` |

---

## Public site settings — `/api/site-settings`

No auth. Used by the storefront for SEO / Open Graph and analytics pixels.

`GET /api/site-settings` → `{ settings }` with `site_name`, `site_title`, `site_description`, `keywords`, OG/Twitter fields, `og_image`, `favicon`, `login_logo`, nested `shop` (`default_view`, `products_per_page`, `categories_visible`, `brands_visible`, `see_all_label`, `show_less_label`), nested `shipping` (`default_fee`, `free_threshold`), nested `analytics` + `pixels` (`enabled` + `id`).

---

## Dashboard site settings — `/api/dashboard/site-settings`

Auth: Bearer **`super_admin`** only. Drives the main website title, SEO, Open Graph, shop catalog defaults, and tracking pixels.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | Full settings + flat tracker IDs for the form |
| PATCH | `/` | Zod body · SQL/PHP/JS-safe strings · tracker ID formats · `shop_default_view` · `shop_products_per_page` (4–48) |
| POST | `/og-image` | Multipart field **`image`** · max **1 MB** · always resized |
| POST | `/favicon` | Multipart field **`image`** · max **1 MB** · always resized |
| POST | `/login-logo` | Multipart field **`image`** · max **1 MB** · always resized |
| PATCH | `/chrome` | Header/footer contact + social URL fields |
| POST | `/nav` | Create menu item (`header`\|`footer_find`\|`footer_care`\|`footer_sell`) |
| PATCH | `/nav/:id` | Update label/href/enabled |
| DELETE | `/nav/:id` | Delete menu item |
| PUT | `/nav/reorder` | Body `{ menu, ordered_ids[] }` · drag-drop positions |
| PATCH | `/home-sections/:id` | Enable/disable home section |
| PUT | `/home-sections/reorder` | Body `{ ordered_ids[] }` |
| GET | `/social-login` | Enabled flags + `has_client_id`, `has_client_secret`, `has_team_id`, `has_key_id`, `has_private_key` · credential values are **never** returned here |
| PATCH | `/social-login` | Body `{ google?, facebook?, apple? }` — see below |
| POST | `/social-login/reveal` | Body `{ password }` · current super admin's password · returns every credential (`client_id`, `team_id`, `key_id`, decrypted `client_secret` / `private_key`) · 5 wrong tries / 15 min → 429 `REVEAL_RATE_LIMITED` · logged to history |

**Social login** (table `social_login_providers`, secrets AES-256-GCM encrypted with `SETTINGS_ENCRYPTION_KEY`, falls back to `JWT_SECRET` — changing the key makes stored secrets unreadable):

| Provider | Fields |
|----------|--------|
| `google` | `is_enabled`, `client_id` (OAuth Web client ID), `client_secret` (optional) |
| `facebook` | `is_enabled`, `client_id` (App ID), `client_secret` (App Secret — **required** to enable) |
| `apple` | `is_enabled`, `client_id` (Services ID), `team_id`, `key_id` (10 chars `A-Z0-9`), `private_key` (full `.p8` PEM) |

All credential fields (IDs and secrets): omit → keep stored value · `null` → remove · string → replace. Enabling without required credentials → 400 `SOCIAL_LOGIN_INCOMPLETE` with `errors["provider.field"]`. History logs "updated/removed" for every credential, never values.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/sms-gateway` | `{ active_provider, env_fallback, providers }` · per provider `is_active`, `has_api_key`, `has_sender_id`, `has_account_sid`, `ready` · values are **never** returned here |
| PATCH | `/sms-gateway` | Body `{ active_provider?, bulksmsbd?, alpha_sms?, ssl_wireless?, twilio? }` — see below |
| POST | `/sms-gateway/reveal` | Body `{ password }` · same re-auth + rate limit as social login (shared counter) · returns decrypted `api_key`, `sender_id`, `account_sid` · logged to history |
| POST | `/sms-gateway/test` | Body `{ phone }` (BD `01…` or E.164) · sends one real SMS via the saved active gateway · 1 per 30 s → 429 `TEST_TOO_SOON` · gateway error → 502 `SMS_TEST_FAILED` |

**SMS gateway** (table `sms_gateway_providers`, `api_key` AES-256-GCM encrypted with `SETTINGS_ENCRYPTION_KEY`). Used for phone verification codes. At most one active; `active_provider: null` → falls back to `SMS_PROVIDER` / `SMS_API_KEY` / `SMS_SENDER_ID` env, else console log (dev only — production throws).

| Provider | Fields (required to activate in **bold**) |
|----------|--------|
| `ssl_wireless` | **`api_key`** (API token), **`sender_id`** (SID) — `POST smsplus.sslwireless.com/api/v3/send-sms` |
| `alpha_sms` | **`api_key`**, `sender_id` (optional masking) — `POST api.sms.net.bd/sendsms` |
| `bulksmsbd` | **`api_key`**, **`sender_id`** — `GET bulksmsbd.net/api/smsapi` |
| `mim_sms` | **`account_sid`** (panel login email), **`api_key`**, **`sender_id`** (registered sender name) — `POST api.mimsms.com/api/SmsSending/SMS` |
| `twilio` | **`account_sid`** (`AC` + 32 hex), **`api_key`** (auth token), **`sender_id`** (`+E.164` From or `MG…` Messaging Service SID) |

Fields: omit → keep · `null` → remove · string → replace. Activating without required fields → 400 `SMS_GATEWAY_INCOMPLETE` with `errors["provider.field"]`. History action `sms_gateway_updated` logs "updated/removed", never values.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/email-provider` | `{ active_provider, env_fallback, providers }` · per provider `host`, `port`, `secure`, `username`, `from_email`, `from_name`, `has_password`, `ready` · password is **never** returned here |
| PATCH | `/email-provider` | Body `{ active_provider?, gmail?, zoho?, sendgrid?, brevo?, mailgun?, smtp? }` — each `{ host?, port?, secure?, username?, password?, from_email?, from_name? }` |
| POST | `/email-provider/reveal` | Body `{ password }` · shared re-auth + rate limit · returns decrypted `password` per provider · logged to history |
| POST | `/email-provider/test` | Body `{ to }` · sends one real email via the saved active provider · 1 per 30 s → 429 `TEST_TOO_SOON` · SMTP error → 502 `EMAIL_TEST_FAILED` |

**Email provider** (table `email_providers`, `password` AES-256-GCM encrypted). Every preset sends over SMTP (nodemailer). At most one active; `active_provider: null` → falls back to `SMTP_*` env, else console log (dev only — production throws).

| Provider | Server | Required to activate |
|----------|--------|--------|
| `gmail` | `smtp.gmail.com:465` SSL | `username` (Gmail address, also the From), `password` (App password) |
| `zoho` | `smtp.zoho.com:465` SSL | `username` (mailbox, also the From), `password` |
| `sendgrid` | `smtp.sendgrid.net:587` · user `apikey` | `password` (API key), `from_email` (verified sender) |
| `brevo` | `smtp-relay.brevo.com:587` | `username` (SMTP login), `password` (SMTP key), `from_email` |
| `mailgun` | `smtp.mailgun.org:587` | `username`, `password`, `from_email` |
| `smtp` | custom `host` / `port` / `secure` | `host`, `port`, `from_email` (username/password optional) |

`host` / `port` / `secure` are stored for `smtp` only; `from_email` is ignored for Gmail/Zoho. `password`: omit → keep · `null` → remove · string → replace. Invalid/missing → 400 `EMAIL_PROVIDER_INCOMPLETE`. History action `email_provider_updated` logs plain fields and "updated/removed" for the password.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/shipping` | `{ shipping: { default_fee, free_threshold, vendor_override } }` |
| PATCH | `/shipping` | Body `{ default_fee?, free_threshold?, vendor_override? }` · `default_fee` 0–1,000,000 · `free_threshold` number or `null` (off) · history action `shipping_updated` |

**Shipping** (columns on `site_settings`): `shipping_default_fee` (default `60`) is used for products without their own fee. `shipping_vendor_override` (default `true`) lets vendors set a per-product `shipping_fee`; when `false`, fees sent by vendors are ignored (admins can always set it). See the shipping rule under [Customer orders](#customer-orders--apicustomerorders).

**Identity media:** `og_image`, `favicon`, `login_logo`  
**Chrome:** `topbar_email`, `topbar_phone`, `footer_blurb`, `footer_phone`, `footer_callout`, `social_*`  
**Menus:** table `site_nav_items` (associative to `site_settings`)  
**Home:** table `home_sections` (component keys + position + enabled)  
**Shop catalog:** `shop_default_view` (`grid4`|`grid3`|`grid2`|`list`, default `grid4`), `shop_products_per_page` (default `12`), `shop_categories_visible` (default `5`), `shop_brands_visible` (default `6`), `shop_see_all_label` / `shop_show_less_label` (sidebar expand/collapse text)
**Analytics IDs:** Google Analytics (`G-…`), GTM (`GTM-…`), Hotjar, Plerdy
**Pixels:** Google Ads (`AW-…`), TikTok, LinkedIn, Twitter/X, Meta (Facebook)

Dashboard UI: `/settings` (shadcn Form + Zod). Tabs include **Header**, **Footer**, **Home** (hero banner editor + section order).

---

## Dashboard users — `/api/dashboard/users`

Auth: Bearer **`super_admin`** only.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List (`q`, `role`, `roles` csv, `status`, `page`, `limit`) |
| GET | `/:id` | Detail |
| PATCH | `/:id` | Update profile/role/status |
| POST | `/:id/restrict` | Block: body `{ status: "inactive"\|"suspended"\|"banned", reason? }` |
| POST | `/:id/unblock` | Reactivate |

List response: `{ users, pagination: { page, limit, total, totalPages } }`

---

## Dashboard shops — `/api/dashboard/shops`

Auth: Bearer **`super_admin`** or **`vendor`**. Vendors only see/manage their own shop. Soft-delete is **super_admin** only.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/slug-preview?name=` | `{ slug, base }` · `exclude_id?` |
| GET | `/` | List shops |
| GET | `/me` | Current vendor shop (or `null`) |
| GET | `/:idOrSlug` | Detail (numeric id **or** slug) |
| GET | `/:idOrSlug/history` | Audit log |
| DELETE | `/:idOrSlug/history` | Clear audit log (DB delete) |
| POST | `/` | Create (`shop_name`, `slug?`, `description?`, `user_id?` required for super, `status?`) |
| PATCH | `/:idOrSlug` | Update |
| POST | `/:idOrSlug/logo` | Multipart **`logo`** · max **5 MB** · always resized |
| POST | `/:idOrSlug/banner` | Multipart **`banner`** · max **5 MB** · always resized |
| DELETE | `/:idOrSlug` | Soft-delete (super only) |

**Shop object:** `id`, `user_id`, `logo_id`, `shop_name`, `slug`, `description`, `status` (`pending`\|`active`\|…), timestamps, `logo`, `user?`.

Dashboard UI uses **`/stores/{slug}`** (not id).

---

## Dashboard site settings — history

`GET /api/dashboard/site-settings/history` — list audit rows (table `site_settings_histories`).  
`DELETE /api/dashboard/site-settings/history` — clear all history rows for the singleton settings.

Saves and OG image uploads append history with field diffs.

---

## Dashboard brands — `/api/dashboard/brands`

Auth: STAFF. Create/update/delete/image: **elevated** only. Vendors read **active** brands only.

Validators: `backend/src/validators/brand.ts` (Zod + SQL/PHP/JS injection guards)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | `q?` (safe text), `active=true\|false\|all`, `page`, `limit` |
| GET | `/slug-preview?name=` | `{ slug }` · name validated for injection |
| GET | `/:id` | |
| POST | `/` | elevated · Zod body |
| POST | `/:id/image` | elevated · multipart field **`image`** · max **1 MB** · resized |
| PATCH | `/:id` | elevated · Zod partial |
| DELETE | `/:id` | elevated soft-delete |

**Body:** `name` (2–120), `slug?` (kebab), `description?` (≤500 or null), `is_active?`, `sort_order?` (0–999999)

**Brand object:** `id`, `name`, `slug`, `description`, `is_active`, `sort_order`, `image_id`, `image` (public media), timestamps, `products_count`.

Create flow: JSON create first, then optional `POST .../image` with field `image`.

Dashboard UI: react-hook-form + shadcn Form + Zod (`dashboard/src/lib/validators/brand.ts`) + client image pre-check.

---

## Dashboard categories — `/api/dashboard/categories`

Auth: STAFF. Mutations + image: **elevated** only. Vendors list/get **active** categories only (for product picking).

Validators: `backend/src/validators/category.ts`  
Icon catalog: `backend/src/data/category-icons.json` (~185 names)

### List

`GET /api/dashboard/categories?q=&parent_id=&active=all&page=1&limit=50`

| Query | Type | Default |
|-------|------|---------|
| `q` | string ≤120 | — |
| `parent_id` | digits or omit | — |
| `active` | `true` \| `false` \| `all` | `all` |
| `page` | int ≥1 | `1` |
| `limit` | 1–100 | `50` |

```json
{
  "categories": [ /* Category */ ],
  "pagination": { "page": 1, "limit": 50, "total": 12, "pages": 1 }
}
```

### Icon library

`GET /api/dashboard/categories/icons`

```json
{
  "icons": [{ "name": "Smartphone", "label": "Phone", "group": "Electronics" }],
  "count": 185
}
```

Use `name` as `icon` on create/update. Must be an exact catalog name (PascalCase).

### Slug preview

`GET /api/dashboard/categories/slug-preview?name=Electronics` → `{ "slug": "electronics" }`

### Get one

`GET /api/dashboard/categories/:id` → `{ "category": { … } }`

### Create

`POST /api/dashboard/categories` — elevated

```json
{
  "name": "Electronics",
  "slug": "electronics",
  "description": "Phones, laptops, and more",
  "icon": "Smartphone",
  "parent_id": null,
  "is_active": true,
  "sort_order": 0
}
```

| Field | Required | Rules |
|-------|----------|--------|
| `name` | yes | 2–150 chars, safe text |
| `slug` | no | kebab-case `a-z0-9-` |
| `description` | no | ≤5000 or `null` |
| `icon` | no | catalog name or `null` |
| `parent_id` | no | digit string or `null` |
| `is_active` | no | boolean (default true) |
| `sort_order` | no | 0–999999 |

**201:** `{ "message": "Category created", "category": { … } }`

### Update

`PATCH /api/dashboard/categories/:id` — elevated · same fields, all optional (at least one required).

### Delete

`DELETE /api/dashboard/categories/:id` — elevated · soft-delete.

### Cover image

`POST /api/dashboard/categories/:id/image` — elevated

| Item | Value |
|------|--------|
| Multipart field | **`image`** |
| Max size | **1 MB** |
| Types | JPEG, PNG, WebP, GIF |
| Server | Resize (max edge 1200) + re-encode via sharp |
| Storage | `uploads/products/` |

```bash
curl -X POST http://localhost:8001/api/dashboard/categories/1/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@cover.jpg"
```

Oversize: `{ "message": "Category image must be 1 MB or smaller", "code": "CATEGORY_IMAGE_TOO_LARGE" }`

### Category object

```ts
type Category = {
  id: string;
  parent_id: string | null;
  image_id: string | null;
  icon: string | null;          // Lucide name from icon catalog
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  image: PublicMedia | null;    // cover photo
  parent: { id: string; name: string; slug: string } | null;
  products_count: number;
  children_count: number;
};
```

**UI tip:** Prefer SVG `icon` for lists; use `image.path` when a cover photo exists.

---

## Dashboard products — `/api/dashboard/products`

Auth: STAFF. Vendors are scoped to their own shop. Elevated may pass `vendor_id` when creating.

### List / detail

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | `q?`, `vendor_id?`, `category_id?`, `status?`, `page`, `limit` |
| GET | `/slug-preview?name=` | `{ slug }` |
| GET | `/shipping-defaults` | `{ shipping: { default_fee, free_threshold, vendor_override, can_edit } }` · `can_edit` = whether this user's `shipping_fee` will be saved |
| GET | `/:id` | Includes `gallery` |

### Create / update

`POST /` · `PATCH /:id`

```json
{
  "vendor_id": "1",
  "category_id": "2",
  "brand_id": "3",
  "name": "Wireless earbuds",
  "slug": "wireless-earbuds",
  "short_description": "Noise-cancelling buds",
  "description": "<p>Rich HTML from TipTap (sanitized)</p>",
  "type": "simple",
  "status": "draft",
  "price": 49.99,
  "stock_qty": 100,
  "sku": "EAR-001",
  "options": [{ "name": "Color", "values": ["Black", "White"] }],
  "variants": [
    {
      "title": "Black",
      "price": 49.99,
      "stock_qty": 50,
      "option_values": { "Color": "Black" }
    }
  ]
}
```

| Field | Notes |
|-------|--------|
| `type` | `simple` \| `variable` |
| `status` | `draft` \| `active` \| `archived` \| `out_of_stock` |
| `description` | Safe HTML subset (no script/PHP) · ≤20_000 |
| `short_description` | ≤500 plain text |
| `options` / `variants` | Required for meaningful variable products |
| `shipping_fee` | Optional · number 0–1,000,000 or `null` (use site default) · `0` = free · ignored for vendors when `shipping_vendor_override` is off |

### Images

| Method | Path | Multipart | Notes |
|--------|------|-----------|--------|
| POST | `/:id/thumbnail` | **`image`** | Primary thumbnail · max 5 MB · always resized |
| POST | `/:id/images` | **`images`** | Gallery · up to 12 files · max 5 MB each · always resized |
| POST | `/:id/images/:mediaId/primary` | — | Set primary from gallery |
| DELETE | `/:id/images/:mediaId` | — | Remove gallery image |

If no thumbnail exists, first gallery upload becomes primary.

### Delete

`DELETE /:id` — soft-delete product + variants.

### Product object (detail)

Includes: `id`, `vendor_id`, `category_id`, `brand_id`, `thumbnail_id`, `name`, `slug`, `description`, `short_description`, `type`, `price`, `stock_qty`, `status`, `thumbnail`, `gallery`, `category`, `vendor`, `brand`, `options`, `variants`, …

---

## Multipart cheat sheet

| Endpoint | Field name | Max |
|----------|------------|-----|
| `POST /api/auth/me/avatar` | `avatar` | 5 MB |
| `POST /api/dashboard/auth/me/avatar` | `avatar` | 5 MB |
| `POST /api/dashboard/categories/:id/image` | `image` | **1 MB** |
| `POST /api/dashboard/brands/:id/image` | `image` | **1 MB** |
| `POST /api/dashboard/site-settings/og-image` | `image` | **1 MB** · resized |
| `POST /api/dashboard/site-settings/favicon` | `image` | **1 MB** · resized |
| `POST /api/dashboard/site-settings/login-logo` | `image` | **1 MB** · resized |
| `POST /api/dashboard/products/:id/thumbnail` | `image` | **5 MB** · resized |
| `POST /api/dashboard/products/:id/images` | `images` | **5 MB** × 12 · resized |
| `POST /api/dashboard/shops/:id/logo` | `logo` | **5 MB** · resized |

Allowed MIME (all uploads): `image/jpeg`, `image/png`, `image/webp`, `image/gif`.  
Do **not** upload SVG.

---

## Public media object

```ts
type PublicMedia = {
  id: string;
  disk: string;
  file_name: string;
  original_name: string | null;
  file_path: string;   // e.g. "products"
  path: string;        // absolute URL for <img src>
  file_size: string | null;
  mime_type: string | null;
  alt_text: string | null;
  collection_name: string;
  is_public: boolean;
  sort_order: number;
};
```

---

## Agent / AI implementation notes

1. **Always** send `Authorization: Bearer` on dashboard and customer protected routes.
2. **Create category first as JSON**, then optionally `POST .../image` with field `image`.
3. **Category `icon`** must match `GET .../categories/icons` → `icons[].name` (not a free-form string).
4. **Product create** needs existing `category_id` and usually `brand_id`; elevated roles need `vendor_id` (shop).
5. **Variable products:** send `type: "variable"` plus `options` and `variants`.
6. **Rich product description** is HTML; server sanitizes to a safe tag subset.
7. Prefer exact error `message` / `code` for UI toasts; use `errors` for field highlighting when present.
8. IDs are **stringified bigints** in JSON (`"12"`), not numbers.
9. Soft-deletes return success with `message`; lists exclude soft-deleted rows.
10. Dashboard app (Vite) typically proxies or calls `http://localhost:8001`; storefront (Next) uses the same API host.

---

## Example flows

### Super admin: create category with icon + cover

```http
POST /api/dashboard/auth/login
{ "identifier": "super@niyenin.com", "password": "..." }

POST /api/dashboard/categories
Authorization: Bearer <accessToken>
{ "name": "Fashion", "icon": "Shirt", "is_active": true }

POST /api/dashboard/categories/42/image
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
image=<file ≤1MB>
```

### Vendor: list categories then create product

```http
GET /api/dashboard/categories?active=true&limit=100
POST /api/dashboard/products
{
  "category_id": "42",
  "brand_id": "7",
  "name": "Cotton tee",
  "type": "simple",
  "status": "draft",
  "price": 19.99,
  "stock_qty": 50
}
POST /api/dashboard/products/99/images
images=<file1>&images=<file2>
```

---

## Related source files

| Concern | Path |
|---------|------|
| Mounts | `backend/src/server.ts` |
| Category routes | `backend/src/routes/dashboardCategories.ts` |
| Category Zod | `backend/src/validators/category.ts` |
| Category image 1MB | `backend/src/lib/categoryImage.ts` |
| Icon names | `backend/src/data/category-icons.json` |
| Product routes | `backend/src/routes/dashboardProducts.ts` |
| Upload middleware | `backend/src/middleware/upload.ts` |
| Unsafe input guards | `backend/src/validators/customerAuth.ts` (`findUnsafeInputReason`) |

When routes change, update this file in the same PR.
