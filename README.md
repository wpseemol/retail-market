# Retail Market

Monorepo for the Niyenin multi-vendor platform. Architecture source of truth: `TARGET_REQUIREMENTS.md`.

## Apps

| App | Stack | Dev URL | Role |
| --- | --- | --- | --- |
| `frontend/` | Next.js (App Router) | http://localhost:3000 | Customer storefront (`www.niyenin.com`) |
| `dashboard/` | Vite + React + ReactDOM SPA | http://localhost:5173 | Admin / Vendor dashboard |
| `backend-api/` | Express (TypeScript) | http://localhost:8001 | API · see [`backend-api/API.md`](backend-api/API.md) |

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

## Production (Spaceship + Vercel)

The current manual deploy is in [`DEPLOY.md`](./DEPLOY.md): the API on Spaceship Web Hosting Supreme (Node.js app, not Docker), and the storefront and dashboard on Vercel. A later move to a VPS can use the Docker stack below. There is no CI pipeline yet.

## Production (Docker)

`docker-compose.yml` is the local stack (MySQL published on the host, plus phpMyAdmin). A server uses `docker-compose.prod.yml`: MySQL stays on the Docker network, uploads live in a volume, and the API refuses to start until the secrets below are set.

```bash
cp .env.production.example .env.production
# fill STOREFRONT_URL, DASHBOARD_URL, API_URL, and the four secrets

pnpm docker:prod
```

That builds three images and starts MySQL, the API (port 8001), the storefront (port 3000), and the dashboard (port 5173). The API applies Prisma migrations on boot. Point a reverse proxy at those ports:

| Public URL | Container |
| --- | --- |
| `STOREFRONT_URL` | frontend:3000 |
| `DASHBOARD_URL` | dashboard:80 |
| `API_URL` | backend:8001 |

`API_URL`, `STOREFRONT_URL`, and `DASHBOARD_URL` are baked into the storefront and dashboard at **build** time. Change them, then run `pnpm docker:prod` again. Set `FRONTEND_BIND`, `DASHBOARD_BIND`, and `BACKEND_BIND` to `127.0.0.1` when the proxy is on the same machine.

The storefront container calls the API at `http://backend:8001` (`INTERNAL_API_URL`). Browsers call `API_URL`. Those two must be the same API.

Logs and a database dump:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.production -f docker-compose.prod.yml exec mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > backup.sql
```

## Structure

```text
retail-market/
├── frontend/                 # Customer storefront (Next.js)
├── dashboard/                # Management SPA (plain React + ReactDOM / Vite)
├── backend-api/              # API (Express)
├── package.json              # Root workspace scripts
├── pnpm-workspace.yaml
└── TARGET_REQUIREMENTS.md    # Master requirements (do not remove)
```
