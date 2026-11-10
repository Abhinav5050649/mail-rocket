---
sidebar_position: 1
title: API endpoints
---

# API endpoints

Base URL: your `API_DOMAIN` (for example `https://api.example.com`), or `http://localhost:3000` in local dev.

- **Auth:** `Authorization: Bearer mr_...` (or `x-api-key`) on everything except `/track` and `/unsubscribe`. See [API keys](../guides/api-keys.md).
- **Bodies:** `POST`/`PUT`/`PATCH` must be `application/json`.
- **Lists:** `?limit=&offset=`, no total count. `/overview` gives counts.
- **Errors:** `{ "error": "message" }` with 400, 401, 403, 404 or 500.

The full schema is the OpenAPI spec: [`resources/openapi/mail-rocket-api.openapi.json`](https://github.com/Abhinav5050649/mail-rocket/blob/main/resources/openapi/mail-rocket-api.openapi.json). Import it into Postman, Insomnia or Swagger UI to try requests.

## Keys and overview

| Method | Path | Claim | Description |
| --- | --- | --- | --- |
| GET | `/me` | none | The calling key |
| GET | `/overview` | per section | Counts; each section is `null` if the key can't read it |
| GET | `/keys` | `read Key` | List keys |
| POST | `/keys` | `create Key` | Create a key (secret returned once) |
| GET | `/keys/{key_id}` | `read Key` | Get a key |
| PATCH | `/keys/{key_id}` | `update Key` | Update a key |
| DELETE | `/keys/{key_id}` | `delete Key` | Revoke a key |

## Organization

| Method | Path | Description |
| --- | --- | --- |
| GET | `/organization` | Get the organization profile |
| PATCH | `/organization` | Update it (name, time zone, …) |
| GET, POST | `/addresses` | List, create addresses |
| GET, PATCH, DELETE | `/addresses/{address_id}` | Get, update, delete an address |
| GET, POST | `/contact-details` | List, create contact details |
| GET, PATCH, DELETE | `/contact-details/{contact_details_id}` | Get, update, delete contact details |

## Identities

| Method | Path | Description |
| --- | --- | --- |
| GET, POST | `/identities` | List, create identities |
| GET, PATCH, DELETE | `/identities/{identity_id}` | Get, update, delete an identity |

## Campaigns

| Method | Path | Description |
| --- | --- | --- |
| GET, POST | `/campaigns` | List, create campaigns |
| GET, PATCH, DELETE | `/campaigns/{campaign_id}` | Get, update (incl. `start_time`), delete a campaign |
| GET | `/campaigns/{campaign_id}/stats` | Delivery, open, click and unsubscribe counts |
| GET | `/campaigns/{campaign_id}/groups` | The groups the campaign sends to (set with `group_ids`) |
| GET | `/campaigns/{campaign_id}/subscribers` | The campaign's audience: its groups' members plus individually picked subscribers, each once |

## Templates, groups, subscribers

| Method | Path | Description |
| --- | --- | --- |
| GET, POST | `/templates` | List, create templates |
| GET, PATCH, DELETE | `/templates/{template_id}` | Get, update, delete a template |
| GET, POST | `/groups` | List, create groups |
| GET, PATCH, DELETE | `/groups/{group_id}` | Get, update, delete a group |
| GET, POST | `/groups/{group_id}/subscribers` | List members, add a subscriber |
| DELETE | `/groups/{group_id}/subscribers/{subscriber_id}` | Remove a subscriber from a group |
| GET, POST | `/subscribers` | List, create subscribers |
| GET, PATCH, DELETE | `/subscribers/{subscriber_id}` | Get, update, delete a subscriber |

## Public (reached from emails, no key)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/track/open/{delivery_id}` | Open pixel |
| GET | `/track/click/{delivery_id}?url=&sig=` | Signed click redirect |
| GET | `/unsubscribe/{delivery_id}` | Confirmation page |
| POST | `/unsubscribe/{delivery_id}` | Unsubscribe (form post or one-click) |
