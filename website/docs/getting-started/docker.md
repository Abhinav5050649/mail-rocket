---
sidebar_position: 2
title: Full stack in Docker
---

# Run the whole stack in Docker

The repo-root `docker-compose.yml` runs everything: `postgres`, `redis`, `api`, `web` and `caddy`.

```bash
cp apps/api/example.env apps/api/.env   # fill in AWS credentials
bun run stack          # docker compose --env-file apps/api/.env up --build -d
bun run db:migrate     # migrations aren't applied automatically
```

Then read the admin key from the API's output:

```bash
docker compose logs api | grep "admin API key"
```

To stop everything:

```bash
bun run stack:down     # add -v to docker compose down to also wipe the database volume
```

:::caution Always pass the env file
Compose is run with `--env-file apps/api/.env` so the `POSTGRES_*` and domain values come from the API's env file. Without it, Compose silently uses the defaults. The `bun run stack` scripts do this for you.
:::

## Where it's served

Caddy is the only public entry point, on ports 80 and 443:

| Site | URL |
| --- | --- |
| Web app | `https://<APP_DOMAIN>` |
| API | `https://<API_DOMAIN>` |

The `api` and `web` containers only listen on localhost. With the domains unset, the stack runs at `https://app.localhost` and `https://api.localhost` with a local certificate your browser will warn about.

To run it on a real server with real certificates, see [Deploy to a server](../deployment/server.md).
