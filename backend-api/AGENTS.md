# backend-api — agent guide

Express + Prisma 6 + MySQL REST API for the Niyenin retail market. Serves the
storefront (`frontend/`, port 3000) and the admin dashboard (`dashboard/`, port 5173).

- **Port:** 8001 (`PORT` in `backend-api/.env`)
- **Package name:** `backend-api` (pnpm workspace member)
- **Public API reference:** [`API.md`](./API.md) — update it whenever an endpoint changes.
- **Change log:** [`CHANGELOG.md`](./CHANGELOG.md) — append every change you make here.

## Scripts

Run from `backend-api/` (or `pnpm --filter backend-api <script>` from the root):

| Script | What it does |
| --- | --- |
| `dev` | `tsx watch src/server.ts` |
| `build` / `start` | Compile with `tsc`, run `dist/server.js` |
| `type-check` | `tsc --noEmit` |
| `db:generate` | `prisma generate` (stop the dev server first on Windows — the query engine DLL is locked) |
| `db:migrate` / `db:push` / `db:seed` / `db:studio` | Prisma helpers |
| `images:optimize` | `scripts/optimize-images.ts` — re-encodes stored media, keeps originals, `--prune-orphans` optional |

## Folder structure

```
backend-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/<timestamp>_<name>/migration.sql
├── scripts/optimize-images.ts
├── uploads/                 # stored media (gitignored)
└── src/
    ├── server.ts            # express app, cors, route mounting
    ├── routes/              # public*, customer*, dashboard*, payments, health
    ├── controllers/
    ├── services/
    ├── middleware/          # auth (Bearer), requireRoles, upload (multer)
    ├── validators/          # Zod schemas per domain (order.ts, cart.ts, ...)
    ├── lib/                 # env, prisma, cart, sslcommerz, image helpers, productReviews,
    │                        # reviewImage, rateLimit (in-memory per-IP)
    ├── utils/
    └── data/
```

## Conventions

- **Validation:** every mutating/list route parses body and query with a Zod schema from `src/validators/`. Wrap user strings with `withSafeInput` / `findUnsafeInputReason` (SQL, PHP, JS, HTML payloads are rejected).
- **Errors:** respond `{ message, code?, errors? }`. Use 409 with a stable `code` for state conflicts (e.g. `ORDER_NOT_DELETABLE`, `ORDER_CHANGED`).
- **Auth:** protected routes require `Authorization: Bearer <token>`. Dashboard catalog mutations require `super_admin | admin | moderator`; order deletion is `super_admin | admin` only.
- **Reviews:** `ProductReview` (`product_reviews`) is the purchase-verified review model; the older `Review` model is unused legacy. Review eligibility = a `delivered` + `paid` order matching the email/phone/user that contains the product. Vendors are scoped to their own shop's products.
- **Uploads:** sniff MIME by magic bytes, enforce multer size limit, always resize with sharp, re-check size after resize, sanitize original filenames. Document field names and limits in `API.md`.
- **Migrations:** add a new folder under `prisma/migrations/` (never edit an applied one). Backfill data in the same SQL when adding non-null columns.
- **Concurrency:** guard state-changing writes with the expected current state in the `where` clause (`updateMany` / `deleteMany`) and return 409 when nothing matched.
- **CORS:** custom response headers the dashboard reads (`Content-Disposition`, `X-Total-Rows`) must be listed in `exposedHeaders` in `server.ts`.

## Workspace rules

See `../.cursor/rules/`:
- `form-upload-security.mdc` — forms, Zod, safe input, uploads, resize
- `confirm-destructive-actions.mdc` — destructive actions need a confirm step in the UI
- `changelog-tracking.mdc` — log every change in this app's `CHANGELOG.md`

## Docker

`backend-api/Dockerfile`; the compose service is still named `backend` because the
frontend uses `INTERNAL_API_URL=http://backend:8001`.
