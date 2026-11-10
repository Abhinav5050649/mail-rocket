---
sidebar_position: 1
title: Deploy to a server
---

# Deploy to a server

Mail Rocket runs as a long-lived process, not serverless. One small VM (an EC2 instance, or any Linux box with Docker) runs the whole stack with Docker Compose: Postgres, Redis, the API, the web app and Caddy.

## 1. Prepare the server

- Install Docker, Git and Bun.
- Give it a static public IP (an Elastic IP on EC2) so DNS and the [SES IP lock](./aws-ses.md#lock-the-key-to-the-server) survive restarts.
- Open ports **80** and **443**. Keep **22** limited to your IP, and don't open 3000, 3001 or 5432.

## 2. Point DNS at it

Create two A records pointing at the server's IP, for example:

| Name | Serves |
| --- | --- |
| `app.example.com` | The web app (`APP_DOMAIN`) |
| `api.example.com` | The API, and the tracking and unsubscribe links in sent emails (`API_DOMAIN`) |

## 3. Configure

:::info Coming soon: images on Docker Hub
We'll soon publish Mail Rocket's images to Docker Hub. You'll then be able to deploy with just a `docker-compose.yml` and an `.env` file on the server, pulling the images instead of cloning the repository and building them there. Until then, use the steps below.
:::

```bash
git clone https://github.com/Abhinav5050649/mail-rocket.git && cd mail-rocket
cp apps/api/example.env apps/api/.env
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
```

See [Configuration](../reference/configuration.md) for every variable, and [AWS SES setup](./aws-ses.md) for the credentials.

## 4. Start

```bash
docker compose --env-file apps/api/.env up --build -d
docker compose logs -f caddy          # watch Caddy get the certificates
```

Migrations aren't run automatically. Postgres listens on `127.0.0.1:5432` on the host, so run them from the server:

```bash
bun install
DB_URL=postgres://<user>:<password>@localhost:5432/<db> bun run db:migrate
```

Get the admin key and sign in at `https://app.example.com`:

```bash
docker compose logs api | grep "admin API key"
```

## HTTPS

Caddy (repo-root `Caddyfile`) is the only service the internet reaches. It gets and renews Let's Encrypt certificates for both domains on its own, and keeps them in the `caddydata` volume.

HTTPS isn't optional: in production the web app's session cookie is `secure`, so signing in over plain HTTP silently fails. Mail clients also expect HTTPS for tracking and unsubscribe links.

## Updating

```bash
git pull
docker compose --env-file apps/api/.env up --build -d
DB_URL=... bun run db:migrate        # if the update added migrations
```

## Operations

```bash
docker compose logs -f api            # follow API logs
docker compose down                   # stop (add -v to also wipe the database volume)
```
