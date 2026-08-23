# --- Build stage: install deps and bundle the server into one file ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime stage: the bundle, plus the @node-rs/bcrypt native binding ---
# (esbuild can't inline a native addon, so it's left external and copied in
# directly instead of pulling the whole node_modules tree back in)
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist/index.mjs ./index.mjs
COPY --from=build /app/node_modules/@node-rs ./node_modules/@node-rs
EXPOSE 3000
CMD ["node", "index.mjs"]
