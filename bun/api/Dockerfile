# --- Build stage: install deps and bundle the server into one file ---
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# --- Runtime stage: the bundle, plus a production-only install of the
# packages bun's bundler left external (packages that load native
# addons or assets from disk at runtime, which bundling breaks) ---
FROM oven/bun:1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/dist/index.js ./index.js
EXPOSE 3000
CMD ["bun", "run", "index.js"]
