# Retail Market Monorepo

This is an e-commerce platform monorepo set up using pnpm workspaces.

## Architecture

- **frontend**: Next.js 16 (App Router, TypeScript, Vanilla CSS)
- **backend**: Express.js (TypeScript)

## Building and Running

From the project root:

- `pnpm dev`: Runs both frontend and backend in parallel.
- `pnpm build`: Builds both frontend and backend.
- `pnpm lint`: Runs linting for the workspace.
- `pnpm type-check`: Runs type-checking for the entire monorepo.

## Project Structure

- `frontend/`: Next.js application.
- `backend/`: Express.js API.

## Development Conventions

- All new packages must be added to `pnpm-workspace.yaml`.
- Use TypeScript for all new code.
- Ensure all dependencies are properly added to the respective package's `package.json`.
- Follow the defined architecture for `backend` (controllers, services, routes).
