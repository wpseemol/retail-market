# Retail Market

Monorepo for the Niyenin multi-vendor platform. Architecture source of truth: `TARGET_REQUIREMENTS.md`.

## Apps

| App | Stack | Dev URL | Role |
| --- | --- | --- | --- |
| `frontend/` | Next.js (App Router) | http://localhost:3000 | Customer storefront (`www.niyenin.com`) |
| `dashboard/` | Vite + React + ReactDOM SPA | http://localhost:5173 | Admin / Vendor dashboard |
| `backend/` | Express (TypeScript) | http://localhost:8001 | API |

## Prerequisites

- [pnpm](https://pnpm.io/) (`packageManager` pinned in root `package.json`)

## Install (one place)

```bash
pnpm install
```

## Run

From the **repo root** (uses `concurrently` so Windows does not nest a broken `pnpm.CMD`):

```bash
# all three apps in parallel (separate ports)
pnpm dev

# or host each server separately
pnpm dev:frontend
pnpm dev:dashboard
pnpm dev:backend
```

| App | URL |
| --- | --- |
| Storefront | http://localhost:3000 |
| Dashboard | http://localhost:5173 |
| API | http://localhost:8001 |

Build:

```bash
pnpm build
pnpm build:frontend
pnpm build:dashboard
pnpm build:backend
```

## Structure

```text
retail-market/
├── frontend/                 # Customer storefront (Next.js)
├── dashboard/                # Management SPA (plain React + ReactDOM / Vite)
├── backend/                  # API (Express)
├── package.json              # Root workspace scripts
├── pnpm-workspace.yaml
└── TARGET_REQUIREMENTS.md    # Master requirements (do not remove)
```
