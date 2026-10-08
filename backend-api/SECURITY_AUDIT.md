# backend-api — Security audit

Tracked from the root index: [`../SECURITY_AUDIT.md`](../SECURITY_AUDIT.md).
Update the **Status** column when an item is fixed (`Open` → `Fixed YYYY-MM-DD`) and log the fix in `CHANGELOG.md`.

- **Last audit:** 2026-10-08
- **Method:** `npm audit` + manual code review of `src/`
- **Totals:** 1 Critical · 6 High · 7 Medium · 5 Low · 4 Info

## Summary

| ID | Severity | Title | Status |
| --- | --- | --- | --- |
| BE-01 | Critical | Client-controlled checkout discount | Open |
| BE-02 | High | `sharp` < 0.35.5 (librsvg CVE-2026-96889) | Open |
| BE-03 | High | JWT / encryption secret falls back to a hard-coded default | Open |
| BE-04 | High | No rate limiting or lockout on login / register | Open |
| BE-05 | High | Unhandled promise rejections crash the server (oversized ids) | Open |
| BE-06 | High | Variant generation can exhaust memory / DB | Open |
| BE-07 | High | Guest review "ownership" = knowing an email or phone | Open |
| BE-08 | Medium | Social login account pre-hijacking | Open |
| BE-09 | Medium | Regex HTML sanitizer can be bypassed (latent stored XSS) | Open |
| BE-10 | Medium | Spoofable `X-Forwarded-For` for rate limits / session IPs | Open |
| BE-11 | Medium | Sessions survive password change; no logout endpoint | Open |
| BE-12 | Medium | No abuse limits on guest checkout; stock never reserved | Open |
| BE-13 | Medium | Vendors see other stores' items and full customer contact on orders | Open |
| BE-14 | Low | Leftover temp uploads inside the public `uploads/` folder | Open |
| BE-15 | Low | No security headers (`helmet`, `nosniff`, `X-Powered-By`) | Open |
| BE-16 | Low | Raw Prisma error messages returned to clients | Open |
| BE-17 | Low | Account enumeration on register / login | Open |
| BE-18 | Low | Vendor business-logic gaps (self-publish shop, search masked PII) | Open |
| BE-19 | Info | `jwt.verify` doesn't pin `algorithms` | Open |
| BE-20 | Info | Order numbers use `Math.random()` (9,000 per day) | Open |
| BE-21 | Info | Unbounded `page` allows huge OFFSET scans | Open |
| BE-22 | Info | `withSafeInput` on passwords rejects valid passwords | Open |
| BE-23 | Medium | Public product API exposes `cost_price` | Open |

## Details

### BE-01 · Critical · Client-controlled checkout discount
- **Where:** `src/validators/order.ts:36`, `src/routes/customerOrders.ts:196-208`
- **Issue:** `discount_amount` comes from the request body and is only capped at the subtotal (`Prisma.Decimal.min(requestedDiscount, subtotal)`). Sending `discount_amount: 999999` makes the order cost only the shipping fee. SSLCommerz validation still passes because it compares against the tampered total, so the order becomes `paid`.
- **Fix:** Remove `discount_amount` from `placeOrderSchema`. Accept a `coupon_code` and compute the discount on the server from a coupon table (expiry, usage limits, scope). Frontend counterpart: FE-03.

### BE-02 · High · Vulnerable `sharp`
- **Where:** `package.json` (`"sharp": "^0.35.4"`)
- **Issue:** `npm audit` reports GHSA-wq5f-xc86-pv6w (librsvg) for `sharp` < 0.35.5. Uploads are processed with sharp.
- **Fix:** `pnpm up sharp@^0.35.5 --filter backend-api`, then re-run the audit.

### BE-03 · High · Hard-coded secret fallback
- **Where:** `src/lib/env.ts:8-26`
- **Issue:** A missing `JWT_SECRET` only logs a warning, then `"dev-only-change-me"` is used, even in production. Anyone could then sign a `super_admin` token and decrypt stored provider secrets (`settingsEncryptionKey` falls back the same way).
- **Fix:** When `NODE_ENV=production`, exit at startup if `JWT_SECRET` or `SETTINGS_ENCRYPTION_KEY` is missing or shorter than 32 bytes. Don't fall back from the encryption key to the JWT secret.

### BE-04 · High · No login throttling
- **Where:** `src/routes/dashboardAuth.ts:48`, `src/routes/customerAuth.ts:27-28`
- **Issue:** `rateLimit()` is only used for product reviews. Staff and customer login, register, social login and refresh have unlimited attempts.
- **Fix:** Per-IP and per-identifier limits with backoff and temporary lockout (shared store such as Redis if multi-instance). Consider MFA for `super_admin` / `admin`.

### BE-05 · High · Server crash via unhandled rejections
- **Where:** `src/routes/publicProducts.ts:219-233` (`BigInt(key)` inside a bare async handler); same pattern in `parseId` of `dashboardProducts.ts:44-51`, `dashboardVendors.ts:179-186`, `dashboardBrands.ts`, `dashboardCategories.ts`; `BigInt(String(req.params.id))` in `dashboardSiteSettings.ts:780,822,882`.
- **Issue:** Express 4 doesn't catch rejected promises. `GET /api/products/99999999999999999999` makes Prisma throw, the rejection is unhandled, and Node exits.
- **Fix:** Wrap every async handler in `asyncHandler` (or move to Express 5). Cap ids with `^\d{1,19}$` + max BIGINT check (reuse `productIdField`). Add a `process.on("unhandledRejection")` logger.

### BE-06 · High · Variant explosion
- **Where:** `src/routes/dashboardProducts.ts:56-62, 114, 192-208, 286-296`
- **Issue:** `type: "variable"` with 5 options × 40 values and no `variants` builds 40⁵ ≈ 102 million combinations, then inserts them one by one.
- **Fix:** Reject when the product of value counts exceeds 200 (matching `variants.max(200)`); insert with `createMany` in one transaction.

### BE-07 · High · Weak guest review ownership
- **Where:** `src/routes/productReviews.ts:186-197, 237-268`, `src/lib/productReviews.ts:25-41, 97-108`
- **Issue:** Knowing someone's email or phone reveals whether they bought a product, their order id and shipping name, and lets an attacker post, edit or delete reviews as them.
- **Fix:** Require a one-time code (or order number + email) for guests; stop returning `orderId` / `authorName` from `check-eligibility`.

### BE-08 · Medium · Social login pre-hijacking
- **Where:** `src/controllers/customerAuthController.ts:149-160, 423-435`
- **Issue:** An attacker registers the victim's email with a password; when the victim later signs in with Google/Facebook/Apple, the provider is linked and the attacker's password still works.
- **Fix:** When linking to an unverified account, clear the password and revoke sessions, or require email verification before password login.

### BE-09 · Medium · Bypassable HTML sanitizer
- **Where:** `src/lib/richHtml.ts:3, 55-77`
- **Issue:** The tag regex requires whitespace after the tag name, so `<iframe/srcdoc=...>` and `<a/href="javascript&colon;...">` pass unchanged. Not rendered as HTML anywhere today, but it's stored XSS waiting to happen.
- **Fix:** Replace with an allowlist sanitizer (`sanitize-html` or DOMPurify + jsdom).

### BE-10 · Medium · Spoofable client IP
- **Where:** `src/server.ts:43` (`trust proxy 1`), `src/lib/rateLimit.ts:18`, `src/lib/userSession.ts:80-86`, `src/routes/publicAnalytics.ts:37-43`
- **Issue:** `clientIp()` takes the first `X-Forwarded-For` entry, which the client controls. Rate limits can be bypassed and session/analytics IPs forged. The frontend proxy forwards the client's header unchanged (FE-06).
- **Fix:** Use `req.ip` everywhere and set `trust proxy` to the real proxy addresses.

### BE-11 · Medium · Sessions not revoked
- **Where:** `src/middleware/auth.ts:32-39`, `src/routes/dashboardAuth.ts:396-399`
- **Issue:** Password change doesn't revoke sessions, `requireAuth` never checks `sid`, and there is no logout endpoint. Customer refresh tokens last 365 days.
- **Fix:** Revoke other sessions on password change; add `POST /logout` for customers and staff (dashboard counterpart: DB-02); optionally check `sid` / token version in `requireAuth`.

### BE-12 · Medium · Checkout abuse and overselling
- **Where:** `src/routes/customerOrders.ts:106, 160-169`
- **Issue:** Order placement has no rate limit (each order fans out notifications and an SSLCommerz session) and stock is checked but never decremented.
- **Fix:** Rate-limit order placement and payment retry; decrement stock atomically (`updateMany where stock_qty >= qty`) in the order transaction.

### BE-13 · Medium · Vendor order over-exposure
- **Where:** `src/routes/dashboardOrders.ts:117-177, 198-215, 397-437`
- **Issue:** On multi-store orders a vendor sees other stores' items/prices and the customer's full email and phone, including in CSV export.
- **Fix:** For vendors, filter `items` to their own products and mask contact details (`maskEmail`).

### BE-14 · Low · Temp uploads in public folder
- **Where:** `src/routes/dashboardProducts.ts:878-885`, `src/middleware/upload.ts:63-69`
- **Fix:** Write multer temp files to `os.tmpdir()` and delete every file on failure.

### BE-15 · Low · No security headers
- **Where:** `src/server.ts:41-59`
- **Fix:** `app.use(helmet())`, `app.disable("x-powered-by")`, `nosniff` + restrictive CSP on `/uploads`.

### BE-16 · Low · Internal errors leaked
- **Where:** `src/routes/dashboardProducts.ts:540-543, 726-729` (`err.message` returned)
- **Fix:** Map known Prisma codes (P2002, …) to friendly messages; log the rest.

### BE-17 · Low · Account enumeration
- **Where:** `src/controllers/customerAuthController.ts:135-146, 187-202`
- **Fix:** Generic messages; run a dummy bcrypt compare when the user doesn't exist.

### BE-18 · Low · Vendor business-logic gaps
- **Where:** `src/routes/dashboardVendors.ts:57, 467` (vendor can create an `active` shop); `src/routes/dashboardReviews.ts:120-129` (search on masked `author_email` / `author_phone`).
- **Fix:** Force `pending` for vendor-created shops; disable email/phone search for vendors.

### BE-19 – BE-22 · Info
- **BE-19:** `src/lib/token.ts:60` — pin `algorithms: ["HS256"]` in `jwt.verify`.
- **BE-20:** `src/routes/customerOrders.ts:96-103` — use `crypto.randomInt` for order numbers.
- **BE-21:** `src/routes/publicProducts.ts:27` and other list routes — cap `page`.
- **BE-22:** `src/routes/customerAuth.ts:76, 82` — don't run passwords through `withSafeInput`.

### BE-23 · Medium · `cost_price` in public responses
- **Where:** `src/lib/productCatalog.ts:128` (`cost_price: decimalToNumber(row.cost_price)` inside `toPublicProduct`), served by `GET /api/products` and `GET /api/products/:idOrSlug`.
- **Issue:** Found 2026-10-08. Every product currently has it `null`, but once a vendor fills it in, anyone can read the store's purchase cost / margin.
- **Fix:** Drop `cost_price` from `toPublicProduct` (keep it only in dashboard serializers).

## Done well
- SSLCommerz settlement re-validates with the gateway (tran_id, amount, currency); fail/cancel only touch pending attempts.
- Item prices and shipping always come from the DB (apart from BE-01).
- Customer addresses, cart, wishlist, notifications and orders are scoped by token `user_id` — no IDOR found.
- `requireRoles` uses the DB role, not the token; banning revokes sessions.
- Uploads: magic-byte sniffing, UUID names, sharp re-encode + size re-check, SVG/HTML/PHP blocked, path containment on delete.
- Only tagged-template `$queryRaw`; no `$queryRawUnsafe`, `child_process` or `eval`.
- Verification codes are HMAC-hashed and compared with `timingSafeEqual`, with attempt caps.
- CSV export escapes formulas; CORS is an allowlist; refresh tokens rotate with reuse detection; provider secrets stored with AES-256-GCM.

## Audit history
| Date | Notes |
| --- | --- |
| 2026-10-08 | Initial audit (BE-01 – BE-22). |
| 2026-10-08 | Added BE-23 (found while adding `/api/products/price-range`). |
