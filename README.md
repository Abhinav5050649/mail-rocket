# Mail Rocket

Self-hosted email campaigns sent through your own AWS SES account. Schedule campaigns, verify sending identities, write HTML templates with `{{variables}}`, and send to recipients and groups. Every request authenticates with an API key whose claims decide what it can do, and every operation is also available to AI clients over MCP.

## Layout

```
apps/
  api/        Bun + Hono API, BullMQ workers, Drizzle/Postgres     → apps/api/README.md
  web/        Next.js app: the UI, with a BFF proxy to the API      → apps/web/README.md
packages/
  shared/     Code both apps import: permissions, wire types, template variables
resources/    Shared docs: OpenAPI spec, DBML + SQL schema, AWS IAM policies
docker-compose.yml   Full stack: postgres, redis, api, web
PRODUCT.md    Who it's for and how it behaves
DESIGN.md     The web app's design system
```

It's a Bun workspace: one `bun install` at the root installs everything into one `bun.lock`. Both apps depend on `@mail-rocket/shared`, and the API checks its responses against the shared types at compile time (`apps/api/src/contracts.ts`).

## Run it locally

Requires [Bun](https://bun.sh) and Docker.

```bash
cp apps/api/example.env apps/api/.env          # then fill in AWS credentials for SES
cp apps/web/.env.example apps/web/.env.local
bun install

docker compose --env-file apps/api/.env up -d postgres redis
bun run db:migrate
bun run dev        # API on :3000, web app on :3001
```

On first start the API prints an admin API key. Sign in to the web app with it at http://localhost:3001.

## Run the whole stack in Docker

```bash
bun run stack          # docker compose --env-file apps/api/.env up --build -d
bun run db:migrate     # migrations aren't applied automatically
bun run stack:down
```

Compose is run with `--env-file apps/api/.env` so the `POSTGRES_*` values come from the API's env file. Without it, compose silently uses the defaults.

## Common tasks

| | |
| --- | --- |
| `bun run test` | API test suites |
| `bun run typecheck` | Type-check both apps and the shared package, including the API/web contract |
| `bun run lint` | Lint the web app |

API internals (layering, auth, send pipeline, deployment) are in [apps/api/README.md](apps/api/README.md) and [apps/api/docs/ARCHITECTURE.md](apps/api/docs/ARCHITECTURE.md). AWS setup is in [apps/api/requirements.md](apps/api/requirements.md).
