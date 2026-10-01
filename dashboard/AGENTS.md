# dashboard — agent guide

Vite + React + TypeScript + shadcn/ui admin panel for the Niyenin retail market.
Talks to `backend-api` (port 8001) with Bearer auth.

- **Port:** 5173 (`vite --port 5173 --strictPort`)
- **API reference:** [`../backend-api/API.md`](../backend-api/API.md)
- **Change log:** [`CHANGELOG.md`](./CHANGELOG.md) — append every change you make here.

## Scripts

| Script | What it does |
| --- | --- |
| `dev` | Vite dev server on 5173 |
| `build` | `tsc -b && vite build` |
| `type-check` | `tsc -b --noEmit` style check — run before finishing |
| `lint` | ESLint |

## Folder structure

```
dashboard/
├── public/logo/niyenin-print.png   # wordmark used on printed invoices
└── src/
    ├── main.tsx                    # providers: Theme, Confirm, Router
    ├── App.tsx                     # route tree, one ProtectedRoute block per RBAC domain
    ├── pages/                      # route pages grouped by feature domain; each folder has an index.ts barrel
    │   ├── auth/                   # LoginPage
    │   ├── overview/               # HomePage (KPIs), RolePage (role workspaces)
    │   ├── account/                # ProfilePage, NotificationsPage
    │   ├── orders/                 # OrdersPage, OrderDetailPage
    │   ├── catalog/                # products/, categories/, brands/ (list + create + edit + BrandShowcasePage)
    │   ├── stores/                 # StoresPage, StoreCreatePage, StoreEditPage, StoreDesignPage
    │   ├── marketing/              # SeoSettingsPage (/seo, super_admin + admin)
    │   ├── access/                 # UsersPage, UserEditPage (staff management)
    │   ├── support/                # ReviewsModerationPage (Support & Quality, all staff, role-limited actions)
    │   └── system/settings/        # super_admin only: SiteSettingsLayout + context/tabs, then
    │       ├── storefront/         #   identity, header, footer, home, shop, social share
    │       ├── integrations/       #   credentials: social login, SMS, email, payment, shipping
    │       ├── tracking/           #   analytics, pixels
    │       └── audit/              #   history
    ├── layouts/
    ├── components/
    │   ├── ui/                     # shadcn primitives
    │   ├── dashboard/page-shell.tsx  # PageHero, FormSection, StickyFormActions
    │   ├── motion.tsx              # LazyMotion `m` + useMotionSafe
    │   ├── providers/ConfirmProvider.tsx  # useConfirm()
    │   ├── orders/                 # order badges, drawer, status dialog, invoices
    │   ├── reviews/                # review stars, status/verified badges, vendor reply dialog
    │   ├── seo/                    # SeoPreview (Google snippet, share card, char counter)
    │   ├── showcase/               # ShowcaseEditor (store + brand page designer), preview, image slot
    │   ├── content/                # FAQ / Terms editor sections (hero, help box, SEO, status), useContentPage
    │   └── brands/                 # brand form shell, BrandLinkedStoreCard
    ├── lib/
    │   ├── api.ts                  # apiFetch / apiDownload (Bearer)
    │   ├── orders.ts               # order labels, roles, delete rules
    │   ├── reviews.ts              # review types, status meta, per-role status rules (mirror the API)
    │   ├── seo.ts                  # SEO page keys, limits, title template helper
    │   ├── showcase.ts             # showcase sections, hero styles, social hosts, contrast helpers
    │   ├── contentPages.ts         # FAQ / Terms page types, API paths, list limits
    │   ├── rbac.ts                 # route role lists named after the TARGET_REQUIREMENTS.md RBAC matrix
    │   ├── imagePresets.ts         # image ratio / size hints per upload type
    │   ├── siteBranding.ts         # cached branding + getPrintBranding()
    │   └── validators/             # Zod schemas + safeInput helpers
    ├── hooks/
    └── store/
```

## Conventions

- **Forms:** create/edit forms use shadcn `Form` + react-hook-form + `zodResolver`, schemas in `src/lib/validators/`. Every string goes through the safe-input helper.
- **Uploads:** pre-check type and size in the UI; helper text always says the image is resized on the server (e.g. `JPEG, PNG, WebP, or GIF · max 1 MB · always resized on the server`). Show the ratio hint from `imagePresets.ts`.
- **Destructive actions:** always `const confirm = useConfirm()` and `await confirm({ title, description, tone: "destructive" })`. Never `window.confirm`.
- **Layout & motion:** pages use `PageHero`, `FormSection`, `StickyFormActions`. Animate with LazyMotion `m` via `useMotionSafe`; no layout animations or `AnimatePresence` on large tables.
- **Roles:** catalog mutations are for `super_admin | admin | moderator`; hide or disable actions the current role cannot perform and show why (title tooltip).
- **Stores, brands & SEO:** `STORE_ROLES` (list + page design: super_admin, admin, vendor), `STORE_MANAGE_ROLES` (create / settings: super_admin, vendor), `STORE_DELETE_ROLES` (super_admin), `SEO_ROLES` (global SEO: super_admin, admin), `BRAND_SHOWCASE_ROLES` (brand page: super_admin, admin, linked vendor — the API checks the link), `BRAND_OWNER_ROLES` (link a brand to a store: super_admin, admin). Brand detail returns `permissions { manage, assign_owner, showcase }`; use it instead of guessing from the role.
- **Content pages:** `pages/content/` holds `FaqPageEditor` (`/content/faq`) and `TermsPageEditor` (`/content/terms`), guarded by `CONTENT_PAGE_ROLES` (super_admin, admin). List items use `useFieldArray({ keyName: "_key" })` because each item has its own `id`. Keep `src/lib/validators/contentPage.ts` in sync with the API schema.
- **Pages & routes:** put new pages in the matching domain folder under `src/pages/`, export them from that folder's `index.ts`, and import from the barrel in `App.tsx`. Guard routes with the role lists from `src/lib/rbac.ts` instead of inline arrays, and keep those lists in sync with the backend's `requireRoles(...)`. Anything that edits global config or stores credentials goes under `pages/system/` (super_admin only); secrets-bearing settings go in `system/settings/integrations/`.
- **Printing:** `window.open` must happen synchronously in the click handler, so branding comes from the synchronous `getPrintBranding()`.

## Workspace rules

See `../.cursor/rules/`: `form-upload-security.mdc`, `confirm-destructive-actions.mdc`, `changelog-tracking.mdc`.
