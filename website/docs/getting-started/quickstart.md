---
sidebar_position: 1
title: Quickstart (local dev)
---

# Quickstart

Run the API and the web app on your machine, with Postgres and Redis in Docker.

## Requirements

- [Bun](https://bun.sh)
- Docker (with Compose)
- An AWS account with SES, and an access key for an IAM user that holds the SES policy. See [AWS SES setup](../deployment/aws-ses.md).

## 1. Configure

```bash
git clone https://github.com/Abhinav5050649/mail-rocket.git
cd mail-rocket

cp apps/api/example.env apps/api/.env          # then fill in AWS credentials for SES
cp apps/web/.env.example apps/web/.env.local
```

In `apps/api/.env`, set at least `AWS_REGION`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. Every variable is described in [Configuration](../reference/configuration.md).

## 2. Install and start

```bash
bun install                                       # one install for the whole workspace

docker compose --env-file apps/api/.env up -d postgres redis
bun run dev                                       # API on :3000, web app on :3001
```

The API applies any pending database migrations each time it starts, so a fresh database needs no separate step.

## 3. Sign in

On first start the API prints an admin key to the terminal:

```text
  mail-rocket admin API key: mr_...
  Store it now; it is not recoverable.
```

Store it, then sign in at [http://localhost:3001](http://localhost:3001) with it.

:::tip Lost the key?
Mint another without restarting: `bun run --cwd apps/api key:create --name me --preset admin`.
:::

![The sign-in page, which asks for an API key](/img/screenshots/sign-in.png)

## Useful commands

| Command | What it does |
| --- | --- |
| `bun run test` | API test suites |
| `bun run typecheck` | Type-checks both apps and the shared package, including the API/web contract |
| `bun run lint` | Lints the web app |
| `bun run --cwd apps/api db:studio` | Browse the database in Drizzle Studio |

## Next

- [Verify a sending identity](../guides/identities.md)
- [Create and schedule a campaign](../guides/campaigns.md)
