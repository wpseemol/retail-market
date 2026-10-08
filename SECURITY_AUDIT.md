# Security audit — index

Root tracker for the three apps. Each app keeps its own detailed findings file; this page only rolls up counts, the cross-app items, and the fix order.

| App | Audit file | Critical | High | Medium | Low | Info | Open |
| --- | --- | --- | --- | --- | --- | --- | --- |
| backend-api | [`backend-api/SECURITY_AUDIT.md`](backend-api/SECURITY_AUDIT.md) | 1 | 6 | 7 | 5 | 4 | 23 |
| frontend | [`frontend/SECURITY_AUDIT.md`](frontend/SECURITY_AUDIT.md) | 2 | 1 | 4 | 4 | 2 | 12 |
| dashboard | [`dashboard/SECURITY_AUDIT.md`](dashboard/SECURITY_AUDIT.md) | 0 | 0 | 3 | 5 | 2 | 8 |

- **Last full audit:** 2026-10-08
- **Dependency audit:** frontend 10 advisories (1 critical) · backend-api 1 high · dashboard 0

## How to use
1. When you fix an item, set its **Status** to `Fixed YYYY-MM-DD` in the app's audit file and log it in that app's `CHANGELOG.md`.
2. Update the counts/Open column above.
3. Re-run the dependency audit for each app (`pnpm audit` in `frontend/`, `npm audit` / `pnpm audit` in `backend-api/` and `dashboard/`) and add a row to **Audit history**.

## Cross-app findings
These need changes in more than one app; fix them together.

| Topic | IDs | Notes |
| --- | --- | --- |
| Client-controlled discount | BE-01, FE-03 | Server must compute discounts from a coupon code. |
| Session revocation / logout | BE-11, DB-02 | Add logout endpoints; revoke on password change. |
| Spoofable client IP | BE-10, FE-07 | Fix `trust proxy` + stop forwarding client `X-Forwarded-For`. |
| HTML sanitizer bypass | BE-09, DB-07 | Replace regex with an allowlist sanitizer. |
| Vulnerable `sharp` | BE-02, FE-02 | Upgrade to ≥ 0.35.5. |
| Missing security headers | BE-15, FE-06, DB-01 | helmet / Next `headers()` / nginx `add_header`. |

## Suggested fix order
1. **BE-01 + FE-03** — free orders via `discount_amount` (actively exploitable, money loss).
2. **FE-01** — upgrade Next.js to ≥ 16.3.8.
3. **BE-05** — one request can crash the API.
4. **BE-03** — fail startup without a strong `JWT_SECRET`.
5. **BE-02 / FE-02** — upgrade `sharp`.
6. **BE-04, BE-06, BE-07** — login throttling, variant cap, guest review proof.
7. Medium items (redirects, token exposure, headers, sessions), then Low / Info.

## Audit history
| Date | Scope | Result |
| --- | --- | --- |
| 2026-10-08 | All three apps — deps + code review | 45 findings (3 Critical, 7 High, 13 Medium, 14 Low, 8 Info incl. 3 OK) |
| 2026-10-08 | backend-api | +BE-23 `cost_price` exposed on public product API (Medium) |
