# Built from the repo root (the Bun workspace), e.g. via the root docker-compose.yml:
#   docker build -f apps/web/Dockerfile .

# --- Build stage: install the web app's deps (plus @mail-rocket/shared) and build ---
FROM oven/bun:1-alpine AS build
WORKDIR /app
# Every workspace manifest is needed for a frozen install of the shared lockfile.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile --filter @mail-rocket/web
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN cd apps/web && bun run build

# --- Runtime stage: the build output, its dependencies and the shared source ---
FROM oven/bun:1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/web/package.json /app/apps/web/next.config.ts ./apps/web/
COPY --from=build /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
WORKDIR /app/apps/web
EXPOSE 3001
CMD ["bun", "run", "start"]
