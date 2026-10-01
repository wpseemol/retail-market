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
    ├── pages/                      # route pages (OrdersPage, *EditPage, settings/*)
    ├── layouts/
    ├── components/
    │   ├── ui/                     # shadcn primitives
    │   ├── dashboard/page-shell.tsx  # PageHero, FormSection, StickyFormActions
    │   ├── motion.tsx              # LazyMotion `m` + useMotionSafe
    │   ├── providers/ConfirmProvider.tsx  # useConfirm()
    │   └── orders/                 # order badges, drawer, status dialog, invoices
    ├── lib/
    │   ├── api.ts                  # apiFetch / apiDownload (Bearer)
    │   ├── orders.ts               # order labels, roles, delete rules
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
- **Printing:** `window.open` must happen synchronously in the click handler, so branding comes from the synchronous `getPrintBranding()`.

## Workspace rules

See `../.cursor/rules/`: `form-upload-security.mdc`, `confirm-destructive-actions.mdc`, `changelog-tracking.mdc`.
