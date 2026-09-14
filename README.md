# Retail Market

A full-stack e-commerce platform monorepo.

## Tech Stack

- **Frontend**: Next.js 16 (App Router, TypeScript, Vanilla CSS)
- **Backend**: Express.js (TypeScript)

## Development

This repository uses [pnpm workspaces](https://pnpm.io/workspaces).

### Prerequisites

- [pnpm](https://pnpm.io/) installed.

### Commands

From the project root:

- `pnpm dev`: Runs both frontend and backend in parallel.
- `pnpm build`: Builds both frontend and backend.
- `pnpm lint`: Runs linting for the workspace.
- `pnpm type-check`: Runs type-checking for the entire monorepo.

## Project Structure

```text
retail-market/
├── frontend/   # Next.js application
├── backend/    # Express.js API
└── ...
```
