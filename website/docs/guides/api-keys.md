---
sidebar_position: 1
title: API keys and permissions
---

# API keys and permissions

Mail Rocket has no users, passwords or tenants. Every request authenticates with an **API key**, and the key is the only principal.

```http
Authorization: Bearer mr_...
```

`x-api-key: mr_...` works too. The web app uses the same keys: you sign in by pasting one.

## Getting a key

- **First boot.** If the database has no keys, the API mints an `admin` key and prints it to stdout once. It isn't written to the logs and can't be recovered, so store it. The check runs on every boot, so an instance whose last key was revoked mints a new one on the next restart.
- **CLI.** Mint a key without a restart:

  ```bash
  bun run --cwd apps/api key:create --name ops --preset admin --expires 2027-01-01
  ```

- **API.** `POST /keys` with a preset or an explicit claim list. The secret appears once, in that response.

  ```bash
  curl -X POST https://api.example.com/keys \
    -H "Authorization: Bearer $MR_KEY" -H "Content-Type: application/json" \
    -d '{ "name": "newsletter-bot", "preset": "editor" }'
  ```

`GET /me` returns the calling key and its claims.

![The API keys page: preset descriptions and the list of keys](/img/screenshots/api-keys.png)

## Claims

What a key may do is a list of `{ action, subject }` grants:

- **Actions:** `read`, `create`, `update`, `delete`
- **Subjects:** `Organization`, `Address`, `ContactDetails`, `Identity`, `Campaign`, `Template`, `Group`, `Subscriber`, `Key`

Every route checks one pair (for example `read Campaign`) and returns `403` if the key doesn't hold it.

## Presets

Three presets expand to claim lists:

| Preset | Grants |
| --- | --- |
| `viewer` | `read` on every subject |
| `editor` | viewer, plus `create`/`update`/`delete` on `Campaign`, `Template`, `Group`, `Subscriber`. Sending identities stay read-only. |
| `admin` | editor, plus `update Organization`, and `create`/`update`/`delete` on `Identity`, `Address`, `ContactDetails`, `Key` |

A key stores the expanded list, not the preset name, so a custom combination is just a different list:

```json
{
  "name": "read-campaigns-only",
  "claims": [
    { "action": "read", "subject": "Campaign" },
    { "action": "read", "subject": "Template" }
  ]
}
```

Wildcards (`manage`, `all`), conditions, field-level grants and inverted rules are rejected, so every stored list is a plain, reviewable set.

## Rules worth knowing

- A key can't change its own claims or revoke itself.
- Revoking a key (`DELETE /keys/:key_id`) deletes it.
- Only a SHA-256 hash of the secret and a short display prefix are stored.
- The web app hides or disables controls a key can't use, but the API is the authority and re-checks every request.
