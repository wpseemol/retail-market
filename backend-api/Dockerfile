# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY dashboard/package.json ./dashboard/
COPY backend-api/package.json ./backend-api/
RUN pnpm install --frozen-lockfile --filter backend-api...

FROM base AS build
COPY --from=deps /app/ ./
COPY backend-api ./backend-api
RUN pnpm --filter backend-api build \
  && pnpm --filter backend-api deploy --prod --legacy /deploy \
  && rm -rf /deploy/dist /deploy/prisma \
  && cp -R backend-api/dist /deploy/dist \
  && cp -R backend-api/prisma /deploy/prisma \
  && cd /deploy && pnpm exec prisma generate

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /deploy ./
COPY backend-api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/uploads

EXPOSE 8001
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8001/api/health >/dev/null || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
