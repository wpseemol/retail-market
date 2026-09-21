# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY dashboard/package.json ./dashboard/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile --filter backend...

FROM base AS build
COPY --from=deps /app/ ./
COPY backend ./backend
RUN pnpm --filter backend build \
  && pnpm --filter backend deploy --prod --legacy /deploy \
  && cp -R backend/prisma /deploy/prisma \
  && cd /deploy && pnpm exec prisma generate

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /deploy ./

EXPOSE 8001
CMD ["node", "dist/server.js"]
