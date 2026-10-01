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
├── app/            # (auth), about, account, actions, api (incl. api/revalidate), auth, brands,
│                   # cart, checkout, contact, shop, stores, wishlist, sitemap.ts, robots.ts, manifest.ts
├── components/     # auth/, cart/, layout, product UI, reviews/ (PDP reviews + write dialog),
│                   # seo/ (JsonLd), showcase/ (store + brand page sections, theme, hero, directory),
│                   # ui/ (shadcn form, label, dialog, tooltip)
├── config/
├── hooks/
├── i18n/           # config.ts (en | bn, cookie), dictionaries/{en,bn}.ts, server.ts (getLocale)
├── lib/            # api.ts, cart.ts, guestCartCookie.ts, cartTypes.ts, reviews.ts, utils.ts (cn), validators/,
│                   # seo.ts (buildMetadata, JSON-LD), showcase.ts, stores.ts, brands.ts
├── store/          # Redux slices: cart, wishlist, auth, siteChrome
├── types/
├── auth.ts         # next-auth config
└── middleware.ts
```

## Conventions

- Server calls go through `src/lib/api.ts`; inside Docker the server side uses `INTERNAL_API_URL`.
- The `/api/backend` route is a proxy to `backend-api` — the name is intentional, don't rename it.
- Guest cart lives in an encrypted cookie; logged-in cart lives in the DB and merges on login.
- Forms use shadcn `Form` + react-hook-form + `zodResolver`, with safe-input checks on strings. Primitives live in `src/components/ui/` (`form`, `label`, `dialog` — built on the `radix-ui` package). For translated validation messages, build the Zod schema from the dictionary (see `src/lib/validators/review.ts`).
- Modals that sit above the sticky header use `z-[90]`+; `QuickView` uses `z-[100]`.
- **Language (English / Bangla):** no hard-coded UI copy in components. Add the key to `src/i18n/dictionaries/en.ts` and `bn.ts`, then use `const { t } = useI18n()` (client) or `await getDictionary()` from `@/i18n/server` (server). Use `format(t.x.y, { count })` for placeholders. The locale lives in the `NEXT_LOCALE` cookie; URLs are not prefixed. Bangladesh only — no currency or country selectors (prices are BDT).
- **SEO:** every page builds metadata with `buildMetadata()` from `src/lib/seo.ts` (canonical, OG, robots) and adds JSON-LD through `components/seo/JsonLd`. `generateMetadata` and the page must request the exact same API URL (share a `pageQuery()` helper) so Next dedupes the fetch. Filtered / sorted / search variants are `noindex`. Next 16 streams metadata to normal browsers — check `<head>` with a `Googlebot` user agent.
- **Cache tags:** API fetches use tags like `stores`, `store:<slug>`, `brands`, `brand:<slug>`, `reviews`. The API calls `POST /api/revalidate` (header `x-revalidate-secret` = `REVALIDATE_SECRET`, same value in both apps) after dashboard edits.
- **Showcase pages:** store and brand pages share `components/showcase/`. Wrap them in `ShowcaseTheme` and use the `sc-accent*` tokens for vendor colours, never raw hex.
- Read `node_modules/next/dist/docs/` before using Next APIs (see block above).

## Workspace rules

See `../.cursor/rules/`: `form-upload-security.mdc`, `confirm-destructive-actions.mdc`, `changelog-tracking.mdc`.
