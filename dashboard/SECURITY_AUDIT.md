# dashboard — Security audit

Tracked from the root index: [`../SECURITY_AUDIT.md`](../SECURITY_AUDIT.md).
Update the **Status** column when an item is fixed (`Open` → `Fixed YYYY-MM-DD`) and log the fix in `CHANGELOG.md`.

- **Last audit:** 2026-10-15 (re-check; only DB-08 fixed so far)
- **Method:** `pnpm audit` + manual review of `src/`, `nginx.conf`, `Dockerfile`, `vite.config.ts`
- **Totals:** 0 Critical · 0 High · 3 Medium · 6 Low · 2 Info (open: 3 Medium · 4 Low)

## Summary

| ID | Severity | Title | Status |
| --- | --- | --- | --- |
| DB-01 | Medium | nginx sends no security headers | Open |
| DB-02 | Medium | Logout doesn't revoke the session on the server | Open |
| DB-03 | Medium | Access + refresh tokens readable by JS in `sessionStorage` | Open |
| DB-04 | Low | `index.html` may be cached by browsers | Open |
| DB-05 | Low | Unused `cn` npm package + stray `package-lock.json` | Open |
| DB-06 | Low | Container runs nginx as root on plain HTTP | Open |
| DB-07 | Low | Product description validator is a bypassable denylist | Open |
| DB-08 | Low | Login form skips shadcn Form + Zod (repo rule) | Fixed 2026-10-08 |
| DB-09 | Info | UI role checks use editable `sessionStorage` (backend enforces) | OK |
| DB-10 | Info | Print window opened without `noopener` (same-origin, escaped) | OK |
| DB-11 | Low | `source-map-js` < 1.2.2 via `@tailwindcss/vite` (build-time DoS) | Fixed 2026-10-15 |

## Details

### DB-01 · Medium · No security headers
- **Where:** `nginx.conf:1-15`
- **Issue:** No CSP / `frame-ancestors` (clickjacking of admin actions), no HSTS, no `nosniff`, nginx version exposed.
- **Fix:** Add at server level with `always`: `server_tokens off;`, a CSP (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: <API>; connect-src 'self' <API>; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`), `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS where TLS terminates. Repeat them in the asset `location` (lines 11-14) because nginx doesn't inherit `add_header` there.

### DB-02 · Medium · Logout is client-only
- **Where:** `src/components/dashboard/nav-user.tsx:177-180`, `src/store/auth.ts:60-63`
- **Issue:** Logout just clears `sessionStorage`; a stolen refresh token stays valid. The API has no logout route (BE-11).
- **Fix:** Add `POST /api/dashboard/auth/logout` on the API and call it before clearing local state.

### DB-03 · Medium · Tokens in `sessionStorage`
- **Where:** `src/store/auth.ts:40-49`, `src/lib/api.ts:60-82`
- **Issue:** Any XSS or compromised dependency can read the refresh token and keep a super-admin session.
- **Fix:** Refresh token in an `HttpOnly; Secure; SameSite=Strict` cookie scoped to the refresh route; access token in memory. At minimum ship DB-01 and DB-02.

### DB-04 · Low · Cacheable `index.html`
- **Where:** `nginx.conf:7-9`
- **Fix:** `location = /index.html { add_header Cache-Control "no-store" always; }`.

### DB-05 · Low · Supply chain
- **Where:** `package.json:25` (`"cn": "^0.4.0"`, unused, ships a CLI bin), `package-lock.json` (npm lockfile in a pnpm workspace)
- **Fix:** `pnpm remove cn --filter dashboard`; delete `dashboard/package-lock.json`.

### DB-06 · Low · Root container
- **Where:** `Dockerfile:27-33`
- **Fix:** Use `nginxinc/nginx-unprivileged:1.27-alpine` on port 8080; TLS + HSTS at the reverse proxy.

### DB-07 · Low · Denylist HTML validation
- **Where:** `src/lib/validators/product.ts:13-31`
- **Issue:** Same bypass as the API sanitizer (BE-09): `<iframe/srcdoc=...>` passes. TipTap renders safely today.
- **Fix:** Rely on a server-side allowlist sanitizer (BE-09); optionally DOMPurify in the UI.

### DB-08 · Low · Login form not on shadcn Form
- **Where:** `src/pages/auth/LoginPage.tsx:51-53, 121-168`
- **Fix:** `loginSchema` in `src/lib/validators/` (identifier via safe-input, max lengths) + `useForm({ resolver: zodResolver(loginSchema) })` + shadcn `Form`.
- **Status:** Fixed 2026-10-08 — `staffLoginSchema` in `src/lib/validators/auth.ts` (safe-input on both fields, length caps) wired through shadcn `Form` + `zodResolver`.

### DB-09 · Info · Client role checks
- `src/components/ProtectedRoute.tsx:26` uses the user from `sessionStorage`, but `AuthSessionGuard` re-fetches `/auth/me` and every API route uses `requireRoles`. Keep `src/lib/rbac.ts` in sync with the API.

### DB-10 · Info · Print window
- `src/components/orders/printInvoices.ts:100` needs the window handle; it's same-origin `about:blank` and every value goes through `escapeHtml`.

### DB-11 · Low · `source-map-js` via Tailwind
- **Where:** `@tailwindcss/vite` → `@tailwindcss/node` → `source-map-js` (GHSA-68fv-2mgg-jv7q)
- **Issue:** Found 2026-10-15. Event-loop DoS on crafted source maps; build-time only.
- **Fix:** Update Tailwind or add a `pnpm.overrides` entry `source-map-js@>=1.2.2` (also covers FE-02).

## Checked and clear
- No `window.confirm` / `alert`; all deletes go through `useConfirm()`.
- No open redirect after login (server-provided `data.home`; `reason` mapped to fixed text).
- `dangerouslySetInnerHTML` only in `components/ui/chart.tsx` with code-defined colours.
- TipTap Link validates protocols; other links point to fixed hosts or server media URLs.
- No `postMessage` listeners; only public `VITE_*` URLs; source maps off; `.env` excluded from Docker context.
- CSV export is built server-side with formula escaping.

## Done well
- Single shared refresh request with mandatory rotation; full logout on refresh failure.
- Session re-checked on mount and tab focus.
- Integration secrets never sent by default; reveal needs password re-check, auto-hides, and is audited.
- Broad safe-input validators and image pre-checks (MIME, size, dangerous names, SVG blocked).
- Multi-stage Docker build with frozen lockfile.

## Audit history
| Date | Notes |
| --- | --- |
| 2026-10-08 | Initial audit (DB-01 – DB-10). |
| 2026-10-15 | Re-audit: DB-01 – DB-07 still open (nginx has no headers, logout is client-only, `cn` + `package-lock.json` still present, nginx runs as root). Added DB-11 from `pnpm audit`. |
| 2026-10-15 | DB-11 fixed via root `pnpm.overrides` (`source-map-js >=1.2.2`). |
