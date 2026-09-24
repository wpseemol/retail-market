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
| `/api/dashboard/auth` | `routes/dashboardAuth.ts` | Staff |
| `/api/dashboard/users` | `routes/dashboardUsers.ts` | `super_admin` |
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

**201/200:** `{ message, accessToken, refreshToken, token, sessionId, user }`

### `POST /api/auth/login`

```json
{ "email": "ada@example.com", "password": "secret123" }
```

Staff accounts must use dashboard login (not this endpoint).

### `POST /api/auth/google`

```json
{ "idToken": "...", "accessToken": "..." }
```

At least one of `idToken` / `accessToken`.

### `POST /api/auth/refresh`

```json
{ "refreshToken": "..." }
```

### `GET /api/auth/me` — Bearer customer

### `PATCH /api/auth/me` — Bearer customer

Optional: `first_name`, `last_name`, `phone`, `gender` (`male`\|`female`\|`other`), `date_of_birth` (`YYYY-MM-DD`).

### `POST /api/auth/me/avatar` — Bearer customer

Multipart field: **`avatar`** · max **5 MB** · JPEG/PNG/WebP/GIF.

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

`first_name?`, `last_name?`, `username?`, `phone?`

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
| GET | `/:id` | Detail |
| GET | `/:id/history` | Audit log |
| POST | `/` | Create (`shop_name`, `slug?`, `description?`, `user_id?` required for super, `status?`) |
| PATCH | `/:id` | Update |
| POST | `/:id/logo` | Multipart **`logo`** · max **5 MB** |
| DELETE | `/:id` | Soft-delete (super only) |

**Shop object:** `id`, `user_id`, `logo_id`, `shop_name`, `slug`, `description`, `status` (`pending`\|`active`\|…), timestamps, `logo`, `user?`.

---

## Dashboard brands — `/api/dashboard/brands`

Auth: STAFF. Create/update/delete: **elevated** only. Vendors read **active** brands only.

Validators: `backend/src/validators/brand.ts` (Zod + SQL/PHP/JS injection guards)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | `q?` (safe text), `active=true\|false\|all`, `page`, `limit` |
| GET | `/slug-preview?name=` | `{ slug }` · name validated for injection |
| GET | `/:id` | |
| POST | `/` | elevated · Zod body |
| PATCH | `/:id` | elevated · Zod partial |
| DELETE | `/:id` | elevated soft-delete |

**Body:** `name` (2–120), `slug?` (kebab), `description?` (≤500 or null), `is_active?`, `sort_order?` (0–999999)

**Brand object:** `id`, `name`, `slug`, `description`, `is_active`, `sort_order`, timestamps, `products_count`.

Dashboard UI: react-hook-form + shadcn Form + Zod (`dashboard/src/lib/validators/brand.ts`).

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

### Images

| Method | Path | Multipart | Notes |
|--------|------|-----------|--------|
| POST | `/:id/thumbnail` | **`image`** | Primary thumbnail · max 5 MB |
| POST | `/:id/images` | **`images`** | Gallery · up to 12 files · max 5 MB each |
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
| `POST /api/dashboard/categories/:id/image` | `image` | **1 MB** |
| `POST /api/dashboard/products/:id/thumbnail` | `image` | 5 MB |
| `POST /api/dashboard/products/:id/images` | `images` | 5 MB × 12 |
| `POST /api/dashboard/shops/:id/logo` | `logo` | 5 MB |

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
