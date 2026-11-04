# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two roles share one self-hosted instance, roughly equally:

- **Admin / operator** (technical): registers SES sending identities and adds their DNS records, mints and revokes API keys, maintains the organization profile.
- **Editors** (campaign work): write HTML templates with `{{variables}}`, build recipient groups, and schedule campaigns.

Everyone signs in with an API key; there are no user accounts. A key's preset (viewer, editor, admin) or explicit CASL claims decide what it can see and change.

## Product Purpose

Mail Rocket schedules and sends email campaigns through the organization's own AWS SES account. Success is a campaign that goes out at its start time from a verified identity to the right recipients, with per-recipient delivery outcomes recorded.

## Positioning

Self-hosted and single-organization: the team owns the SES account, the database and the keys. Every REST operation is also exposed as an MCP tool, so AI clients can run campaigns with the same claims.

## Operating Context

- Campaign lifecycle: draft → scheduled (has a start time) → sending → sent | failed (with a failure reason).
- Identities: domain or email; created → pending (SES verification in flight, DNS TXT/CNAME records to add) → active. Only active identities can send.
- Templates, groups and recipients can be linked to a campaign. A recipient can be in any number of groups (`group_recipient`). A campaign sends to its directly linked recipients plus everyone in its linked groups, each person once; `{{group_name}}` lists all of a recipient's groups.
- Template variables: recipient first/last/full name and email, group name, campaign name and start date, organization name, sender email. A recipient missing a value is skipped at send time.
- Lists paginate by limit/offset with no total count; `/overview` gives counts.
- The organization has one IANA time zone (default UTC). Every date is shown in it, start times are entered in it, and `{{campaign_start_date}}` is rendered in it. Timestamps are absolute instants, so changing the zone never moves a scheduled send.

## Capabilities and Constraints

- Backend: Bun + Hono API (`apps/api`); frontend: Next.js app (`apps/web`) talking to it through a BFF proxy that holds the key in an httpOnly cookie.
- UI controls are hidden or disabled by the key's claims; the server is the authority.
- Not available: open/click tracking, analytics over time, search endpoints, bulk recipient import.

## Brand Commitments

Name: "Mail Rocket". No other brand assets are binding (confirmed: start fresh).

## Evidence on Hand

No customers, testimonials or usage statistics. All figures on screen come from the instance's own data.

## Product Principles

1. The next send is always visible: what goes out, when, from which identity.
2. Nothing sends from an unverified identity without the UI saying so plainly.
3. Every screen shows only what the signed-in key can read, and hides actions it can't take.
4. Honest numbers: zeros print as zeros, missing values as a dash, no invented trends.
