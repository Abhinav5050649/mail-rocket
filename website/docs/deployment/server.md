---
sidebar_position: 1
title: Deploy to a server
---

# Deploy to a server

Mail Rocket runs as a long-lived process, not serverless. One small VM (an EC2 instance, or any Linux box with Docker) runs the whole stack with Docker Compose: Postgres, Redis, the API and web app from their published images ([`abhinav2911/mail-rocket-api`](https://hub.docker.com/r/abhinav2911/mail-rocket-api) and [`abhinav2911/mail-rocket-web`](https://hub.docker.com/r/abhinav2911/mail-rocket-web), for amd64 and arm64), and Caddy.

## 1. Prepare the server

- Install Docker (with the Compose plugin). Nothing else is needed: no clone, no build.
- Give it a static public IP (an Elastic IP on EC2) so DNS and the [SES IP lock](./aws-ses.md#lock-the-key-to-the-server) survive restarts.
- Open ports **80** and **443**. Keep **22** limited to your IP, and don't open 3000, 3001 or 5432.

## 2. Point DNS at it

Create two A records pointing at the server's IP, for example:

| Name | Serves |
| --- | --- |
| `app.example.com` | The web app (`APP_DOMAIN`) |
| `api.example.com` | The API, and the tracking and unsubscribe links in sent emails (`API_DOMAIN`) |

## 3. Configure

The server needs three files from the repository: the Compose file, the Caddyfile and the env file.

```bash
mkdir mail-rocket && cd mail-rocket
RAW=https://raw.githubusercontent.com/Abhinav5050649/mail-rocket/main
curl -fsSL -O $RAW/docker-compose.yml -O $RAW/Caddyfile
mkdir -p apps/api && curl -fsSL $RAW/apps/api/example.env -o apps/api/.env
chmod 600 apps/api/.env
```

In `apps/api/.env` set at least:

```bash
NODE_ENV=production
POSTGRES_PASSWORD=<a strong password>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
APP_DOMAIN=app.example.com
API_DOMAIN=api.example.com
PUBLIC_API_URL=https://api.example.com
TRACKING_SECRET=<openssl rand -hex 32>
MAIL_ROCKET_VERSION=0.1.0     # pin a release; empty means latest
```

See [Configuration](../reference/configuration.md) for every variable, and [AWS SES setup](./aws-ses.md) for the credentials.

## 4. Start

```bash
docker compose --env-file apps/api/.env pull
docker compose --env-file apps/api/.env up -d
docker compose logs -f caddy          # watch Caddy get the certificates
```

The API applies database migrations itself each time it starts, so there's nothing to run by hand.

Get the admin key and sign in at `https://app.example.com`:

```bash
docker compose logs api | grep "admin API key"
```

## HTTPS

Caddy (repo-root `Caddyfile`) is the only service the internet reaches. It gets and renews Let's Encrypt certificates for both domains on its own, and keeps them in the `caddydata` volume.

HTTPS isn't optional: in production the web app's session cookie is `secure`, so signing in over plain HTTP silently fails. Mail clients also expect HTTPS for tracking and unsubscribe links.

## Updating

Set `MAIL_ROCKET_VERSION` in `apps/api/.env` to the new release (or leave it empty to follow `latest`), then:

```bash
docker compose --env-file apps/api/.env pull
docker compose --env-file apps/api/.env up -d     # the API applies any new migrations as it starts
```

Available versions are listed under **Tags** on [Docker Hub](https://hub.docker.com/r/abhinav2911/mail-rocket-api/tags). To run your own changes instead, build from a clone: see [From source](../getting-started/docker.md#from-source).

## Operations

```bash
docker compose logs -f api            # follow API logs
docker compose down                   # stop (add -v to also wipe the database volume)
```
