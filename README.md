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
├── backend/                  # Server API (Node.js/Express or Laravel)
│   ├── src/ (or app/)
│   └── package.json
│
├── frontend/                 # Customer Storefront (Next.js App Router)
│   ├── public/
│   │   ├── icons/            # SVG icons
│   │   ├── images/           # All product & promotional images
│   │   └── logo/             # niyenin-dark.png & niyenin-white.png
│   ├── src/
│   │   ├── app/              # Next.js routes
│   │   └── components/       # Storefront sections (Hero, Slider, Footer, etc.)
│   ├── tailwind.config.ts
│   └── package.json
│
├── dashboard/                # Management Dashboard (Vanilla React + ReactDOM SPA)
│   ├── public/
│   │   └── index.html        # HTML root mounting point (#root)
│   ├── src/
│   │   ├── assets/
│   │   ├── components/       # Shared UI (Sidebar, Navbar, Tables, Badges)
│   │   ├── layouts/          # Super Admin, Admin, Moderator, Vendor layouts
│   │   ├── pages/            # Role-specific dashboard views
│   │   ├── routes/           # React Router route guards (RBAC)
│   │   ├── App.jsx (or .tsx)
│   │   ├── main.jsx (or .tsx)# React 18 createRoot & ReactDOM mount
│   │   └── index.css         # Tailwind directives
│   ├── index.html            # Entry HTML (if using Vite)
│   ├── package.json
│   └── tailwind.config.js
│
├── .cursorrules              # Cursor IDE workspace rules
└── TARGET_REQUIREMENTS.md    # Master architecture reference
```
