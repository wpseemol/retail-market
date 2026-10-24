# Security audit — index

Root tracker for the three apps. Each app keeps its own detailed findings file; this page only rolls up counts, the cross-app items, and the fix order.

| App | Audit file | Critical | High | Medium | Low | Info | Open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| backend-api | [`backend-api/SECURITY_AUDIT.md`](backend-api/SECURITY_AUDIT.md) | 1 | 7 | 7 | 6 | 4 | 16 |
| frontend | [`frontend/SECURITY_AUDIT.md`](frontend/SECURITY_AUDIT.md) | 2 | 1 | 4 | 4 | 2 | 9 |
| dashboard | [`dashboard/SECURITY_AUDIT.md`](dashboard/SECURITY_AUDIT.md) | 0 | 0 | 3 | 6 | 2 | 6 |
| workspace root | this file | 0 | 0 | 0 | 1 | 0 | 0 |

Severity columns count all findings ever logged; **Open** is what's left.

- **Last full audit:** 2026-10-15 (re-check of every item, then fixes for the top items)
- **Dependency audit (`pnpm audit`, whole workspace):** 2 high left — `braces` (dev-only, no patch published) and `deepmerge-ts` (Prisma CLI). Down from 16.

## Workspace root findings

| ID | Severity | Title | Status |
| --- | --- | --- | --- |
| WS-01 | Low | `shell-quote` < 1.11.0 via root `concurrently` (GHSA-pqg4-j6r4-53mv, critical advisory but dev-only, no untrusted input) | Fixed 2026-10-15 — root `pnpm.overrides` |

## How to use
1. When you fix an item, set its **Status** to `Fixed YYYY-MM-DD` in the app's audit file and log it in that app's `CHANGELOG.md`.
2. Update the counts/Open column above.
3. Re-run the dependency audit for each app (`pnpm audit` in `frontend/`, `npm audit` / `pnpm audit` in `backend-api/` and `dashboard/`) and add a row to **Audit history**.

## Cross-app findings
These need changes in more than one app; fix them together.

| Topic | IDs | Notes |
| --- | --- | --- |
| Client-controlled discount | BE-01, FE-03 | Fixed 2026-10-15 — server computes the discount from `coupon_code`. |
| Session revocation / logout | BE-11, DB-02 | Add logout endpoints; revoke on password change. |
| Spoofable client IP | BE-10, FE-07 | Fixed 2026-10-24 — `trust proxy` 1 plus `PROXY_IP_SECRET`. The storefront no longer forwards client `X-Forwarded-For`. |
| HTML sanitizer bypass | BE-09, DB-07 | Replace regex with an allowlist sanitizer. |
| Vulnerable `sharp` | BE-02, FE-02 | Fixed 2026-10-15 — 0.35.5 everywhere. |
| Transitive dep overrides | BE-24, BE-25, FE-02, DB-11, WS-01 | Root `pnpm.overrides` added 2026-10-15 (`proxy-addr`, `qs`, `source-map-js`, `shell-quote`, `sharp`). Still open: `braces`, `deepmerge-ts`. |
| Missing security headers | BE-15, FE-06, DB-01 | BE-15 and DB-01 fixed 2026-10-24. FE-06 still needs a CSP that allows the storefront pixels. |

## Suggested fix order
Done 2026-10-15: BE-01 + FE-03, FE-01, BE-05, BE-24, BE-03, BE-02 / FE-02 (`sharp`).

1. **BE-07** — guest review proof. Login throttling (BE-04) and the variant cap (BE-06) are fixed.
2. **BE-11 / DB-02** — logout does not revoke the server session. Client IP (BE-10, FE-07) is fixed.
3. Medium items still open (redirects, token exposure, storefront CSP, sessions), then Low / Info.

## Audit history
| Date | Scope | Result |
| --- | --- | --- |
| 2026-10-08 | All three apps — deps + code review | 45 findings (3 Critical, 7 High, 13 Medium, 14 Low, 8 Info incl. 3 OK) |
| 2026-10-08 | backend-api | +BE-23 `cost_price` exposed on public product API (Medium) |
| 2026-10-15 | All three apps — re-check + `pnpm audit` | No new fixes besides DB-08. New: BE-24 (High), BE-25 (Low), DB-11 (Low), WS-01 (Low). 46 open. |
| 2026-10-15 | Fixes | BE-01, BE-02, BE-03, BE-05, BE-24, FE-01, FE-03, DB-11, WS-01 fixed; FE-02 partly. 37 open, 0 critical. |
| 2026-10-24 | Deploy prep | BE-04, BE-06, BE-10, BE-15, FE-07, DB-01 fixed. SMS/email/WhatsApp hourly caps. Manual Spaceship + Vercel deploy in `DEPLOY.md`. 31 open. |
