---
sidebar_position: 2
title: Configuration
---

# Configuration

## API (`apps/api/.env`)

Start from `apps/api/example.env`. Docker Compose reads this file too (`--env-file apps/api/.env`).

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | | `3000` | Port the API listens on |
| `NODE_ENV` | | `dev` | Environment name |
| `LOG_LEVEL` | | `info` | pino log level |
| `DB_URL` | yes | | Postgres URL for local dev. Under Compose it's built from the `POSTGRES_*` values instead. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Compose | `postgres` / `postgres` / `mail-rocket` | Credentials for the `postgres` container |
| `REDIS_URL` | yes | | Redis for the job queues. Overridden under Compose. |
| `AWS_REGION` | yes | | Region your SES identities live in |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | | | IAM user's access key. Omit on EC2 with an instance role. See [AWS SES setup](../deployment/aws-ses.md). |
| `SES_SEND_RATE_PER_SECOND` | | `14` | Emails per second; match your SES quota |
| `PUBLIC_API_URL` | | | The API's public URL, no trailing slash. Turns on [tracking and unsubscribe](../guides/tracking-and-unsubscribe.md). |
| `TRACKING_SECRET` | with `PUBLIC_API_URL` | | Signs click links. Generate with `openssl rand -hex 32`; never change it. |
| `APP_DOMAIN` | | `app.localhost` | Domain Caddy serves the web app on |
| `API_DOMAIN` | | `api.localhost` | Domain Caddy serves the API on |
| `MAIL_ROCKET_VERSION` | | `latest` | Docker Hub release Compose pulls for `api` and `web`, e.g. `0.1.0`. Ignored when building from source with `--build`. |

## Web app (`apps/web/.env.local`)

Start from `apps/web/.env.example`.

| Variable | Default | Description |
| --- | --- | --- |
| `BUN_API_URL` | `http://localhost:3000` | Where the web app's server-side proxy reaches the API. Server-only; never prefix it with `NEXT_PUBLIC_`. |
| `SESSION_COOKIE_NAME` | `mr_session` | Name of the httpOnly cookie holding the signed-in key |
