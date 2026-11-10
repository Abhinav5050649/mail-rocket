---
sidebar_position: 1
title: Introduction
slug: /intro
---

# Mail Rocket

Mail Rocket is a self-hosted tool for email campaigns. It sends through **your own AWS SES account**: you run the server, and you own the database, the subscriber list and the keys.

With it you can:

- register **sending identities** (a domain or a single address) and verify them with SES,
- write **HTML templates** with `{{variables}}` filled in per subscriber,
- build **subscriber groups** and link them to campaigns,
- **schedule campaigns** that go out at their start time, in rate-limited chunks,
- see **per-subscriber delivery**, plus open, click and unsubscribe counts.

![The overview page: campaign, identity and subscriber counts, upcoming sends, recent sends and campaigns by status](/img/screenshots/overview.png)

## How it fits together

| Part | What it is |
| --- | --- |
| `apps/api` | A Bun + Hono API. BullMQ workers for sending and identity verification run in the same process. Postgres via Drizzle, Redis for the job queues. |
| `apps/web` | A Next.js web app. It talks to the API through a server-side proxy that keeps your API key in an httpOnly cookie. |
| `packages/shared` | Permission model, wire types and template variables, shared by both apps. |
| `Caddyfile` | HTTPS reverse proxy in front of both apps, with automatic certificates. |

## Who uses it

One instance serves one organization. Two kinds of people usually share it:

- **Admins / operators** register SES identities and add their DNS records, mint and revoke API keys, and keep the organization profile up to date.
- **Editors** write templates, build subscriber groups and schedule campaigns.

There are no user accounts. Everyone signs in with an [API key](./guides/api-keys.md), and the key's claims decide what it can see and change.

## What it doesn't do (yet)

Bounce and complaint tracking, analytics over time, search endpoints and bulk subscriber import aren't available today. See [What's next?](./faq.md#whats-next) for what's planned.

## Next steps

- [Quickstart](./getting-started/quickstart.md): run it on your machine.
- [Deploy to a server](./deployment/server.md): run it in production with HTTPS.
- [API reference](./reference/api.md): every endpoint.
