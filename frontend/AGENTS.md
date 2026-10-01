<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# frontend — agent guide

Next.js 16 (App Router, Turbopack) storefront for the Niyenin retail market.
Data comes from `backend-api` (port 8001).

- **Port:** 3000 (`next dev --port 3000`)
- **API reference:** [`../backend-api/API.md`](../backend-api/API.md)
- **Change log:** [`CHANGELOG.md`](./CHANGELOG.md) — append every change you make here.

## Stack

Next 16.3.5, React, next-auth 5 (beta), Redux Toolkit, framer-motion, Tailwind.

## Scripts

`dev`, `build`, `start`, `lint` (run from `frontend/` or `pnpm --filter frontend <script>`).

## Folder structure

```
frontend/src/
├── app/            # (auth), about, account, actions, api, auth, cart, checkout,
│                   # contact, shop, stores, wishlist
├── components/     # auth/, cart/, layout, product UI
├── config/
├── hooks/
├── lib/            # api.ts, cart.ts, guestCartCookie.ts, cartTypes.ts
├── store/          # Redux slices: cart, wishlist, auth, siteChrome
├── types/
├── auth.ts         # next-auth config
└── middleware.ts
```

## Conventions

- Server calls go through `src/lib/api.ts`; inside Docker the server side uses `INTERNAL_API_URL`.
- The `/api/backend` route is a proxy to `backend-api` — the name is intentional, don't rename it.
- Guest cart lives in an encrypted cookie; logged-in cart lives in the DB and merges on login.
- Forms use shadcn `Form` + react-hook-form + `zodResolver`, with safe-input checks on strings.
- Read `node_modules/next/dist/docs/` before using Next APIs (see block above).

## Workspace rules

See `../.cursor/rules/`: `form-upload-security.mdc`, `confirm-destructive-actions.mdc`, `changelog-tracking.mdc`.
