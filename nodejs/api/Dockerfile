# --- Build stage: install deps and bundle the server into one file ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime stage: the bundle, plus a production-only install of the
# packages esbuild left external (native addons and packages that load
# assets from disk at runtime, which bundling breaks) ---
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist/index.mjs ./index.mjs
EXPOSE 3000
CMD ["node", "index.mjs"]
