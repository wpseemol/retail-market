# Retail Market Monorepo

This is an e-commerce platform monorepo set up using pnpm workspaces.

## Architecture

- **frontend**: Next.js 16 storefront (App Router, TypeScript)
- **dashboard**: Vite + React admin / vendor dashboard
- **backend-api**: Express.js (TypeScript) API

## Building and Running

From the project root:

- `pnpm dev`: Runs frontend, dashboard and backend-api in parallel.
- `pnpm build`: Builds all three apps.
- `pnpm lint`: Runs linting for the workspace.
- `pnpm type-check`: Runs type-checking for the entire monorepo.

## Project Structure

- `frontend/`: Next.js application — see `frontend/AGENTS.md`.
- `dashboard/`: Admin dashboard — see `dashboard/AGENTS.md`.
- `backend-api/`: Express.js API — see `backend-api/AGENTS.md` and `backend-api/API.md`.

## Development Conventions

- All new packages must be added to `pnpm-workspace.yaml`.
- Use TypeScript for all new code.
- Ensure all dependencies are properly added to the respective package's `package.json`.
- Follow the defined architecture for `backend-api` (routes, validators, lib).
- Log every change in the app's `CHANGELOG.md`.
