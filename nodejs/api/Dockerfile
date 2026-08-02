# --- Build stage: install deps and bundle the server into one file ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime stage: only the bundle, no node_modules needed ---
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist/index.mjs ./index.mjs
EXPOSE 3000
CMD ["node", "index.mjs"]
