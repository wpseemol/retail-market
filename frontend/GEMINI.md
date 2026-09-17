# Retail Market Frontend

This directory contains the Next.js frontend application for the Retail Market platform.

## Architecture

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, Vanilla CSS
- **State/Theme Management**: `next-themes` (via `ThemeProvider`)
- **Project Structure**:
  - `src/app/`: Next.js App Router pages and layouts.
  - `src/components/`: Reusable components (e.g., `Header`, `TopBar`, `providers`).

## Building and Running

From the `frontend` directory:

- `pnpm dev`: Starts the development server.
- `pnpm build`: Builds the application for production.
- `pnpm start`: Starts the production server.
- `pnpm lint`: Runs ESLint.

## Development Conventions

- Follow the existing folder structure (`src/app/`, `src/components/`).
- Use Tailwind CSS utility classes for styling.
- Keep components small and focused in `src/components/`.
- Ensure all new components are typed with TypeScript.
