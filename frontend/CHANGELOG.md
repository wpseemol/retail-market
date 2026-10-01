# frontend — Changelog

Every change made to this app is recorded here, newest first.
Format: date heading, then one bullet per change with the files touched.

## 2026-10-01

### Docs
- Added a project section to `AGENTS.md` (below the Next.js auto block) and this `CHANGELOG.md`.
- `Dockerfile`: copies `backend-api/package.json` after the backend folder rename.

### Cart
- `src/lib/guestCartCookie.ts`: guest cart stored in an encrypted cookie.
- `src/lib/cart.ts`, `src/lib/cartTypes.ts`, `src/store/cartSlice.ts`: logged-in users use the DB cart; guest cart merges on login (same product → quantity increased).
- `src/app/cart/page.tsx`, `src/components/cart/CartPageContent.tsx`, `ShippingSummaryValue.tsx`: redesigned cart page with item selection.
- `src/app/checkout/page.tsx`: checks out only the selected items; items can be removed there.

## Earlier

- `src/app/shop/page.tsx`: products-per-page picker, default comes from the dashboard shop setting.
- Store cards use `object-contain` so logos are not cropped; stale image cache fix.
- `src/components/auth/*` (`AuthShell`, `AuthTabs`, `authMotion.ts`, `LoginForm`, `SignUpForm`): animated login/register switch with smoother height animation.
