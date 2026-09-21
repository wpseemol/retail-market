# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY dashboard/package.json ./dashboard/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile --filter frontend...

FROM base AS build
COPY --from=deps /app/ ./
COPY frontend ./frontend

ARG NEXT_PUBLIC_API_URL=http://localhost:8001
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter frontend build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build /app/frontend/public ./frontend/public
COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "frontend/server.js"]
