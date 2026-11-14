---
name: dashboard-design
description: >-
  Niyenin admin dashboard visual system — Geist Sans typography, simple list-page
  headers (title + muted subtitle + right actions), and when to use PageHeader
  vs green PageHero. Use when redesigning dashboard pages, list headers,
  Overview/Orders/Users/Stores/Products chrome, or when the user asks for a
  more professional dashboard look.
---

# Dashboard design

## Typography

- Font: **Geist Sans** (`font-sans`). Self-hosted via `@fontsource/geist-sans` in `src/index.css`.
- Do not use Poppins or Google Fonts CDN on the dashboard.

## List / analytics page header (`PageHeader`)

Use for Overview, Orders, Users, Stores, Products, Reviews, and similar index pages.

```tsx
import { PageHeader } from "@/components/dashboard/page-shell";

<PageHeader
  title="Orders"
  description="Track every storefront order — approve, pack, hand over to the courier."
  actions={<>…buttons / segmented control…</>}
/>
```

Rules:

- Flat chrome only — **no** green banner, eyebrow, or rounded hero card.
- Left: `text-2xl font-semibold tracking-tight` title + `text-sm text-muted-foreground` description.
- Right: actions aligned to the end (`items-end` on large screens).
- Prefer outline / default shadcn buttons — not “white on green hero” variants.
- Optional segmented control: bordered `rounded-lg` group with active `bg-background shadow-sm`.

## Form / edit heroes (`PageHero`)

Keep the green `#14361c` `PageHero` for create/edit flows (products, stores, users, profile, SEO, content editors) and role workspaces. Do not replace those with `PageHeader`.

## Surfaces

- Cards: `rounded-2xl border border-border/80 bg-card shadow-sm`.
- Toolbars: light border + muted strip is fine; avoid heavy brand gradients on list toolbars when matching Overview.
- Spacing: page root `flex flex-col gap-5` or `gap-6`.

## Motion

- **Login only:** `FadeUp` (opacity + rise).
- **Route changes:** `pageEnter` in `DashboardLayout` (opacity + slight horizontal slide) — not the login rise.
- **Page chrome** (`PageHeader` / `PageHero` / settings cards): prefer `FadeIn`.
- `Stagger` for small lists; no layout animations on large tables. Use `useMotionSafe`.
