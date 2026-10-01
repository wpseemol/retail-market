# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY dashboard/package.json ./dashboard/
COPY backend-api/package.json ./backend-api/
RUN pnpm install --frozen-lockfile --filter dashboard...

FROM base AS build
COPY --from=deps /app/ ./
COPY dashboard ./dashboard

ARG VITE_API_URL=http://localhost:8001
ARG VITE_APP_URL=http://localhost:5173
ARG VITE_STOREFRONT_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL

RUN pnpm --filter dashboard build

FROM nginx:1.27-alpine AS runner
COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dashboard/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
