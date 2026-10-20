# Built from the repo root (the Bun workspace), e.g. via the root docker-compose.yml:
#   docker build -f apps/api/Dockerfile .

# --- Build stage: install the API's deps and bundle the server into one file ---
FROM oven/bun:1-alpine AS build
WORKDIR /app
# Every workspace manifest is needed for a frozen install of the shared lockfile.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile --filter @mail-rocket/api
COPY packages/shared packages/shared
COPY apps/api apps/api
# Set only now, after the install: the bundler bakes NODE_ENV into the bundle,
# and the logger picks its production (JSON) transport from it. Without this
# the bundle reaches for the dev-only pino-pretty, which isn't installed.
ENV NODE_ENV=production
RUN cd apps/api && bun run build

# --- Runtime stage: the bundle (with @mail-rocket/shared inlined), plus a
# production-only install of the packages bun's bundler left external
# (packages that load native addons or assets from disk at runtime) ---
FROM oven/bun:1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared packages/shared
RUN bun install --frozen-lockfile --production --filter @mail-rocket/api
COPY --from=build /app/apps/api/dist/index.js apps/api/index.js
# logs/ resolves against this directory (see src/libs/logger.ts).
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["bun", "run", "index.js"]
