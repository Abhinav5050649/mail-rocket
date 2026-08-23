# Architecture diagrams

Companion to the [Architecture](../README.md#architecture) section of the README — the same flows, as diagrams.

## Contents

1. [System overview](#1-system-overview)
2. [Request flow](#2-request-flow)
3. [Auth &amp; access](#3-auth--access)
4. [Data model](#4-data-model)
5. [Identity verification](#5-identity-verification)
6. [Campaign send pipeline](#6-campaign-send-pipeline)

---

## 1. System overview

A single long-lived Node process serves HTTP and runs the BullMQ workers side by side, sharing one Postgres pool and one Redis connection.

```mermaid
flowchart LR
    Client(["Client"])

    subgraph Proc["Node process — index.ts"]
        direction TB
        API["Hono app<br/>routes . controllers . services"]
        W1["Campaign workers<br/>dispatch . send-chunk . finalize"]
        W2["Identity verify worker"]
    end

    PG[("PostgreSQL<br/>pooled pg.Pool")]
    Redis[("Redis<br/>BullMQ job store")]
    SES[["AWS SES"]]

    Client -- "HTTPS / JSON, Bearer JWT" --> API
    API -- "drizzle queries" --> PG
    API -- "enqueue jobs" --> Redis
    Redis -- "deliver jobs" --> W1
    Redis -- "deliver jobs" --> W2
    W1 --> PG
    W2 --> PG
    W1 -- "SendEmail" --> SES
    API -- "VerifyIdentity" --> SES
    W2 -- "GetVerificationAttributes" --> SES
```

**Notes**

- `connectDB()` runs `select 1` before `serve()` starts — an unreachable database stops the process instead of surfacing as request-time errors.
- `startCampaignWorkers()` / `startIdentityVerificationWorker()` are called directly from the root `index.ts`, reusing the same pg pool and Redis connection as the HTTP layer rather than a separate deployable.
- The pooled TCP client is a deliberate fit for a long-lived process — the pool is created once at boot and shared across every request instead of being opened per call.

## 2. Request flow

Every endpoint follows the same four-layer chain: routes are thin wiring, controllers translate HTTP ↔ domain and own the 400/404 decisions, services hold all business logic and Drizzle queries, and models are pure schema.

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as authenticate / requireRole
    participant Rt as Route (Hono)
    participant Ctl as Controller
    participant Svc as Service
    participant DB as Postgres (Drizzle)

    C->>MW: Request with Authorization: Bearer JWT
    MW->>MW: verifyAuthToken(token) -> userId
    MW->>MW: requireRole(minRole) via organization_user
    alt token missing/invalid or role too low
        MW-->>C: 401 / 403 HTTPException
    else authorized
        MW->>Rt: next()
        Rt->>Ctl: bound handler(c)
        Ctl->>Ctl: validate route params
        Ctl->>Svc: domain call
        Svc->>DB: db.select/insert/update/delete
        DB-->>Svc: rows
        Svc-->>Ctl: entity or null
        alt entity is null
            Ctl-->>C: 404 HTTPException
        else found
            Ctl-->>C: 200/201 c.json(result)
        end
    end
```

**Notes**

- Not-found is a return value, not a throw: services return `null` for "no match"; only the controller — the HTTP-aware layer — turns that into a `404 HTTPException`.
- Services never see Hono's `Context`. No `HTTPException`, no `c.req`/`c.json` below the controller — keeps business logic callable from both HTTP handlers and BullMQ job processors (see §6).
- Controllers don't wrap DB calls in try/catch; anything unexpected is caught once, globally, by `errorHandler` and returned as a generic 500.
- Each `*Route.ts` constructs its service/controller once at module scope; arrow-function class methods keep `this` bound so the same instances are safely reused across every request.

## 3. Auth & access

`/auth` is the only route group that skips authentication. Everything else sits behind two independent checks: who you are, then what you're allowed to do in *this* organization.

```mermaid
sequenceDiagram
    participant C as Client
    participant Auth as AuthController/Service
    participant DB as Postgres
    participant Prot as protectedRoute
    participant Role as requireRole check

    rect rgba(15,110,99,0.08)
    Note over C,DB: Public - /auth (no token required)
    C->>Auth: POST /auth/signin (email, password)
    Auth->>DB: select user by email
    Auth->>Auth: compare bcrypt hash
    Auth-->>C: 200 with token
    end

    rect rgba(194,65,12,0.08)
    Note over C,Role: Protected - everything else
    C->>Prot: GET /organizations/ORG_ID/campaigns, Bearer token
    Prot->>Prot: authenticate sets userId on context
    Prot->>Role: requireRole('editor')
    Role->>DB: getByOrganizationAndUser(orgId, userId)
    DB-->>Role: organization_user row (role)
    Role->>Role: rank(role) at least rank('editor') ?
    Role-->>Prot: next() or 403 Forbidden
    end
```

**Notes**

- Role lives on the join row, not the user: `organization_user.role` (`viewer` < `editor` < `admin`) is per-membership — the same person can be `admin` in one organization and `viewer` in another.
- `.use('*', authenticate)` is attached to `protectedRoute` before any `.route(...)` is mounted on it, since a matched handler never falls through to middleware registered after it.
- `requireSelf` guards `/users/:id` profile edits by comparing the route param to `c.get('userId')` — no organization membership needed to edit your own record.

## 4. Data model

`organization` is the tenant root. Nearly every table carries `organization_id`; the one exception is `user`, which is many-to-many with `organization` through the `organization_user` join row — which is also where the per-organization `role` lives.

```mermaid
erDiagram
    ORGANIZATION ||--o{ ORGANIZATION_USER : membership
    USER ||--o{ ORGANIZATION_USER : "belongs via"
    ORGANIZATION ||--o{ IDENTITY : owns
    ORGANIZATION ||--o{ CAMPAIGN : runs
    IDENTITY ||--o{ CAMPAIGN : "sends as (From)"
    CAMPAIGN ||--o{ TEMPLATE : revisions
    CAMPAIGN ||--o{ GROUP : "recipient lists"
    GROUP ||--o{ RECIPIENTS : contains
    CAMPAIGN ||--o{ RECIPIENTS : targets
    CAMPAIGN ||--o{ CAMPAIGN_RECIPIENT : "one send"
    RECIPIENTS ||--o{ CAMPAIGN_RECIPIENT : "per-send outcome"

    ORGANIZATION_USER {
        enum role "viewer, editor, admin"
    }
    IDENTITY {
        enum type "domain, email"
        enum status "created, pending, active"
    }
    CAMPAIGN {
        enum status "draft, scheduled, sending, sent, send_failed"
    }
    CAMPAIGN_RECIPIENT {
        enum send_status "pending, sent, failed"
    }
```

**Notes**

- `campaign_recipient` is an audit trail, not a mutation: a send creates one row per recipient per send; the underlying `recipients` row is never touched, so the same recipient stays reusable across future campaigns.
- Templates are revisions, not slots: a campaign can hold several `template` rows; `SendCampaignService` picks "the" one to send by `updated_at desc` — there's no `is_final` flag today.
- Every row id is an app-generated UUID string (`varchar`, not Postgres's native `uuid` type), kept consistent so FK columns match without a cast.

## 5. Identity verification

SES verification is asynchronous and open-ended — a domain owner may take arbitrarily long to add DNS records. Rather than a cron sweep, each identity drives its own BullMQ job that reschedules itself until SES confirms.

```mermaid
sequenceDiagram
    participant Ctl as IdentityController
    participant Svc as IdentityService
    participant SES as AWS SES
    participant DB as Postgres
    participant Q as identity-verify queue
    participant Wk as IdentityVerificationWorker

    Ctl->>Svc: create(type, identity)
    Svc->>SES: VerifyEmailIdentity / VerifyDomain + Dkim
    SES-->>Svc: verification token(s) / DNS records
    Svc->>DB: insert identity, status pending
    Svc->>Q: add job, jobId = identityId, delay 5m
    Svc-->>Ctl: identity row (+ DNS records for domains)

    loop until verified
        Q->>Wk: deliver "verify" job
        Wk->>DB: getById(identityId)
        Wk->>SES: GetIdentityVerificationAttributes
        SES-->>Wk: VerificationStatus
        alt Status is Success
            Wk->>DB: update status = active
            Note over Wk: poll stops
        else not yet
            Wk->>Q: reschedule, jobId = identityId, delay 5m
        end
    end
```

**Notes**

- The SES call happens before the DB insert. If `VerifyEmailIdentityCommand`/`VerifyDomainIdentityCommand` throws, nothing is written — no orphaned `identity` row pointing at an unregistered SES identity.
- Job id equals entity id: reusing `identityId` as the BullMQ `jobId`, combined with `removeOnComplete`/`removeOnFail`, means the worker's self-requeue can never collide with a still-pending job.
- No attempt cap — unlike the campaign pipeline, this poll has no retry ceiling. It stops only when SES confirms or the identity row is deleted (the worker checks and exits).

## 6. Campaign send pipeline

A scheduled campaign is one delayed BullMQ job. When it fires, the dispatch worker builds the recipient manifest and hands it to a `FlowProducer`, which fans the send out into rate-limited chunk jobs that all report back to a single finalize job.

```mermaid
flowchart TD
    A["Campaign create/update<br/>status + start_time + identity_id set"] --> B["scheduleCampaignDispatch<br/>dispatch queue . jobId = campaignId . delay until start_time"]
    B -- "start_time arrives" --> C["dispatch worker: processDispatch"]
    C --> D["build recipient manifest<br/>insert campaign_recipient rows (pending)"]
    D --> E["chunk recipient ids<br/>CHUNK_SIZE = 25"]
    E --> F["campaignFlowProducer.add<br/>1 finalize parent + N send-chunk children"]

    F --> G1["send-chunk worker<br/>chunk 1"]
    F --> G2["send-chunk worker<br/>chunk 2"]
    F --> G3["send-chunk worker<br/>chunk N"]

    G1 --> SES1[["SES SendEmail<br/>rate-limited: sesSendRatePerSecond"]]
    G2 --> SES1
    G3 --> SES1

    G1 -. settled .-> H["finalize worker: finalizeCampaign"]
    G2 -. settled .-> H
    G3 -. settled .-> H

    H --> I{"any recipient<br/>send_status = sent ?"}
    I -- yes --> J["campaign.status = sent"]
    I -- no --> K["campaign.status = send_failed"]
```

**Notes**

- Rescheduling is idempotent by design: `scheduleCampaignDispatch` reuses `jobId = campaignId`; editing a campaign's `start_time` removes and re-adds the same job instead of creating a duplicate — but only while it's still `delayed`/`waiting`. An already-firing job is left alone.
- A stuck chunk can't block the campaign: chunk jobs carry `ignoreDependencyOnFailure`, so a chunk that exhausts all 5 retries still lets the finalize parent run rather than hanging the whole send.
- Chunk jobs re-fetch everything fresh: `sendChunk` re-reads the campaign, identity, and template by id rather than trusting the job payload, and skips recipients already marked `sent`, so a BullMQ retry of a partially-sent chunk is safe.
- Partial delivery isn't total failure: `finalizeCampaign` only marks `send_failed` when *zero* recipients succeeded — routine per-recipient bounces don't flip the whole campaign's status; `campaign_recipient.send_status` is the accurate per-recipient record.
- Queue-orchestration stays out of the service layer: `CampaignWorkers.ts` owns the `FlowProducer` wiring; `SendCampaignService` never imports from `src/queues/`, so it stays callable and testable independent of BullMQ.
