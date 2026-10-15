# frontend — Security audit

Tracked from the root index: [`../SECURITY_AUDIT.md`](../SECURITY_AUDIT.md).
Update the **Status** column when an item is fixed (`Open` → `Fixed YYYY-MM-DD`) and log the fix in `CHANGELOG.md`.

- **Last audit:** 2026-10-08
- **Method:** `pnpm audit` + manual code review of `src/`, `next.config.ts`, `.env.local` (variable names only)
- **Totals:** 2 Critical · 1 High · 4 Medium · 4 Low · 2 Info

## Summary

| ID | Severity | Title | Status |
| --- | --- | --- | --- |
| FE-01 | Critical | `next` 16.3.5 — RCE in `next/og` ImageResponse (GHSA-vcvr-r3jv-pc5j) + SSRF, cache poisoning, info disclosure | Fixed 2026-10-15 |
| FE-02 | High | Transitive deps: `sharp` (via next), `braces`, `source-map-js` | Partly fixed 2026-10-15 (`braces` has no patch yet) |
| FE-03 | Critical | Checkout sends `discount_amount`; coupons validated only in the browser | Fixed 2026-10-15 |
| FE-04 | Medium | Open redirect via `?next=` (middleware + login/sign-up) | Open |
| FE-05 | Medium | Backend access token exposed in `/api/auth/session` | Open |
| FE-06 | Medium | No security headers (CSP, HSTS, frame-ancestors, …) | Open |
| FE-07 | Medium | API proxy forwards client-supplied `X-Forwarded-For` | Open |
| FE-08 | Low | Analytics IDs interpolated raw into inline scripts | Open |
| FE-09 | Low | CMS / vendor links rendered without a scheme check | Open |
| FE-10 | Low | Payment `gateway_url` followed without an origin check | Open |
| FE-11 | Low | 1-year session; rotated refresh token not persisted by proxy | Open |
| FE-12 | Info | `/api/backend` proxy forwards any backend path | Open |
| FE-13 | Info | `.env.local` — no secrets under `NEXT_PUBLIC_` (clean) | OK |

## Details

### FE-01 · Critical · Vulnerable Next.js
- **Where:** `package.json` (`"next": "16.3.5"`)
- **Issue:** `pnpm audit` reports: critical RCE in `next/og` ImageResponse (GHSA-vcvr-r3jv-pc5j, fixed 16.3.6); high SSRF in Image Optimization (GHSA-cjq9-62q9-8jv4); moderate cache poisoning / draft-mode leak / metadata info disclosure (GHSA-4jqv-mc3x-m676, GHSA-mcj8-r9mp-w47p, GHSA-3w37-wq28-93x7, GHSA-f87g-xv8r-7p7x); low dev MCP endpoint disclosure (GHSA-39w2-rjm5-chcv). No `next/og` / `opengraph-image` usage exists today, but the image optimizer and ISR are used.
- **Fix:** `pnpm up next@^16.3.8 eslint-config-next@^16.3.8 --filter frontend`, rebuild, re-run `pnpm audit`. Update the version in `AGENTS.md`.
- **Status:** Fixed 2026-10-15 — `next` and `eslint-config-next` now 16.4.1; all Next advisories gone from `pnpm audit`.

### FE-02 · High · Vulnerable transitive dependencies
- `sharp` < 0.35.5 via `next` (GHSA-wq5f-xc86-pv6w) — fixed by the Next upgrade or a `pnpm.overrides` entry.
- `braces` ≤ 3.0.3 via `eslint-config-next` (GHSA-vfj7-8cjw-p6xm) — dev-only; no patched version yet, monitor.
- `source-map-js` < 1.2.2 via `@tailwindcss/postcss` (GHSA-68fv-2mgg-jv7q) — build-time; update Tailwind or override to `>=1.2.2`.
- **Status 2026-10-15:** `sharp` and `source-map-js` fixed by root `pnpm.overrides`; `braces` still open (no patched version published).

### FE-03 · Critical · Client-side discount
- **Where:** `src/components/checkout/CheckoutPageContent.tsx:514` (`discount_amount: discount`), `src/store/cartSlice.ts:207-216, 361-362` (hard-coded `SAVE10` / `SAVE20`)
- **Issue:** The browser computes the discount and the API trusts it (BE-01). Anyone can POST `discount_amount: 999999`. Coupon codes are visible in the bundle.
- **Fix:** Send only `coupon_code`; remove coupon logic from Redux; show the discount returned by the server.
- **Status:** Fixed 2026-10-15 — `applyCoupon` is now a thunk calling `POST /api/customer/orders/coupon`; hard-coded codes and the "Try SAVE10 or SAVE20" hint removed; checkout sends `coupon_code` only and clears the coupon on `COUPON_INVALID`.

### FE-04 · Medium · Open redirect
- **Where:** `src/middleware.ts:40-50`, `src/lib/authRedirect.ts:5`, `LoginForm.tsx:67`, `SignUpForm.tsx:49`
- **Issue:** The check allows `/\evil.com` (middleware) and `/%09/evil.com` (tab, login pages); both resolve to `evil.com`.
- **Fix:** One shared `safeNextPath`: reject `\` and control chars, then require `new URL(raw, origin).origin === origin` and use only `pathname + search`.

### FE-05 · Medium · Access token in client session
- **Where:** `src/auth.ts:291` (`session.accessToken = token.accessToken`)
- **Issue:** Any XSS (including third-party pixel scripts) can `fetch('/api/auth/session')` and steal the backend Bearer token. No client code uses it.
- **Fix:** Delete that line and the `accessToken` field in `src/types/next-auth.d.ts`.

### FE-06 · Medium · Missing security headers
- **Where:** `next.config.ts:17-28`
- **Fix:** Add `async headers()` with HSTS, `X-Frame-Options: DENY` / `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and a nonce-based CSP allowlisting GTM, Meta, TikTok, Hotjar, LinkedIn, Twitter, Google sign-in and SSLCommerz. Set `poweredByHeader: false`.

### FE-07 · Medium · Forwarded client IP
- **Where:** `src/app/api/backend/[...path]/route.ts:32-36`
- **Issue:** Incoming `x-forwarded-for` is passed to the API unchanged, letting attackers rotate fake IPs past per-IP limits (see BE-10).
- **Fix:** Derive the IP from a trusted hop, or add a shared secret header between frontend and API.

### FE-08 · Low · Raw IDs in inline scripts
- **Where:** `src/components/providers/AnalyticsPixels.tsx:35, 59, 82, 111, 128, 136, 155` (e.g. unquoted `hjid:${hotjar.id}`)
- **Fix:** Re-validate IDs with the backend regexes in `getSiteSettings()` and insert with `JSON.stringify(id)`.

### FE-09 · Low · Unchecked CMS links
- **Where:** `InfoSections.tsx:101`, `PromoBannerSlider.tsx:130`, `HeroBanner.tsx:154, 226`, `HelpCta.tsx:39`, `storefrontLinks.ts`
- **Fix:** Share the `isSafeHref` logic from `AnnouncementBar.tsx:12-14` and use it for every CMS/vendor-supplied link.

### FE-10 · Low · Unchecked payment redirect
- **Where:** `CheckoutPageContent.tsx:526`, `CheckoutResultContent.tsx:130`
- **Fix:** Only navigate if the URL is `https://` on `*.sslcommerz.com`.

### FE-11 · Low · Session lifetime / refresh handling
- **Where:** `src/auth.ts:110, 114`, `src/app/api/backend/[...path]/route.ts:48-67`
- **Fix:** ~30-day sliding session; persist rotated refresh tokens (or let the Auth.js `jwt` callback own all refreshes). `trustHost: true` is only safe behind a proxy that sets `Host`.

### FE-12 · Info · Open proxy surface
- **Where:** `src/app/api/backend/[...path]/route.ts:16`
- **Fix:** Allowlist route families (`public`, `customer`, `cart`, `payments`, `auth`, `reviews`) and reject `..` segments.

### FE-13 · Info · Environment (clean)
- `.env.local` only exposes public values under `NEXT_PUBLIC_` (API/app/dashboard URLs, Google client ID). `AUTH_SECRET` and `REVALIDATE_SECRET` are server-only. No env file is tracked in git.

## Done well
- JSON-LD escapes `<` (`JsonLd.tsx:8`, `shop/[slug]/page.tsx:182-185`); no other `dangerouslySetInnerHTML`.
- `/api/revalidate` uses `timingSafeEqual`, fails closed, and restricts tags.
- Tokens live in the encrypted httpOnly Auth.js cookie; old localStorage tokens are cleared.
- Guest cart cookie is AES-256-GCM encrypted; prices and shipping come from the backend.
- Admin text is rendered via `PlainRichText`, never as HTML.
- `images.remotePatterns` restricted to API/media `/uploads/**`; `dangerouslyAllowSVG` off.
- Server Actions check `auth()`; staff roles refused on the storefront; no `console.*` PII logging.

## Audit history
| Date | Notes |
| --- | --- |
| 2026-10-08 | Initial audit (FE-01 – FE-13). |
| 2026-10-15 | Re-audit: FE-01 – FE-12 all still open (`next` 16.3.5, `discount_amount` + `SAVE10`/`SAVE20` in the client, `session.accessToken`, no `headers()`, `X-Forwarded-For` passthrough, unchecked `gateway_url`, 365-day session). `pnpm audit`: same 10 advisories. |
| 2026-10-15 | Fixed FE-01, FE-03; FE-02 partly (only `braces` left). |
