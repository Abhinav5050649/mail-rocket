---
sidebar_position: 2
title: Full stack in Docker
---

# Run the whole stack in Docker

The repo-root `docker-compose.yml` runs everything: `postgres`, `redis`, `api`, `web` and `caddy`. Use the published images from Docker Hub, or build them from a clone of the repository.

| Image | What it runs |
| --- | --- |
| [`abhinav2911/mail-rocket-api`](https://hub.docker.com/r/abhinav2911/mail-rocket-api) | The API and its background workers |
| [`abhinav2911/mail-rocket-web`](https://hub.docker.com/r/abhinav2911/mail-rocket-web) | The web app |

Both are built for `linux/amd64` and `linux/arm64`, and tagged with each release's version (`0.1.0`, `0.1`) and `latest`.

## From Docker Hub

No clone needed: three files are enough.

```bash
mkdir mail-rocket && cd mail-rocket
RAW=https://raw.githubusercontent.com/Abhinav5050649/mail-rocket/main
curl -fsSLO $RAW/docker-compose.yml
curl -fsSLO $RAW/Caddyfile
mkdir -p apps/api && curl -fsSL $RAW/apps/api/example.env -o apps/api/.env
```

Fill in the AWS credentials in `apps/api/.env` (see [Configuration](../reference/configuration.md)). Set `MAIL_ROCKET_VERSION` there to pin a release, such as `0.1.0`; left empty, the stack runs `latest`. Then:

```bash
docker compose --env-file apps/api/.env pull
docker compose --env-file apps/api/.env up -d
```

To update later, change `MAIL_ROCKET_VERSION` (or leave it on `latest`) and run the same two commands again.

## From source

From a clone, `bun run stack` builds both images from the code instead of pulling them:

```bash
cp apps/api/example.env apps/api/.env   # fill in AWS credentials
bun run stack          # docker compose --env-file apps/api/.env up --build -d
```

A local build is tagged with the Docker Hub names, so it's used until the next `docker compose pull` replaces it.

## First sign-in

The API applies database migrations itself when it starts, so there's no separate migrate step. Read the admin key from the API's output:

```bash
docker compose logs api | grep "admin API key"
```

To stop everything:

```bash
docker compose --env-file apps/api/.env down   # add -v to also wipe the database volume
```

(`bun run stack:down` does the same from a clone.)

:::caution Always pass the env file
Compose is run with `--env-file apps/api/.env` so the `POSTGRES_*`, domain and `MAIL_ROCKET_VERSION` values come from the API's env file. Without it, Compose silently uses the defaults. The `bun run stack` scripts do this for you.
:::

## Where it's served

Caddy is the only public entry point, on ports 80 and 443:

| Site | URL |
| --- | --- |
| Web app | `https://<APP_DOMAIN>` |
| API | `https://<API_DOMAIN>` |

The `api` and `web` containers only listen on localhost. With the domains unset, the stack runs at `https://app.localhost` and `https://api.localhost` with a local certificate your browser will warn about.

To run it on a real server with real certificates, see [Deploy to a server](../deployment/server.md).
