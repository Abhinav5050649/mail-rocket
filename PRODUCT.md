# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two roles share one self-hosted instance, roughly equally:

- **Admin / operator** (technical): registers SES sending identities and adds their DNS records, mints and revokes API keys, maintains the organization profile.
- **Editors** (campaign work): write HTML templates with `{{variables}}`, build subscriber groups, and schedule campaigns.

Everyone signs in with an API key; there are no user accounts. A key's preset (viewer, editor, admin) or explicit CASL claims decide what it can see and change.

## Product Purpose

Mail Rocket schedules and sends email campaigns through the organization's own AWS SES account. Success is a campaign that goes out at its start time from a verified identity to the right subscribers, with per-subscriber delivery outcomes recorded.

## Positioning

Self-hosted and single-organization: the team owns the SES account, the database and the keys.

## Operating Context

- Campaign lifecycle: draft → scheduled (has a start time) → sending → sent | failed (with a failure reason).
- Identities: domain or email; created → pending (SES verification in flight, DNS TXT/CNAME records to add) → active. Only active identities can send.
- Templates, groups and subscribers are shared libraries. A campaign is set up on one page: it picks one template and its audience (any number of groups plus individually picked subscribers), and the same template, group or subscriber can serve any number of campaigns. A subscriber can be in any number of groups (`group_subscriber`). A campaign sends to everyone in its groups plus anyone picked individually, each person once; `{{group_name}}` lists all of a subscriber's groups. Template and audience are fixed once a send starts.
- Bulk subscriber work: import a CSV (an `email` column, optional first/last name) into any number of groups. Emails already on the list are matched case-insensitively and reused, not duplicated, and bad or repeated rows are reported per line instead of failing the import. Lists have row checkboxes with select-all for the rows shown: on Subscribers, delete the selected people (anyone a campaign was already sent to is kept with their send history); on a group, remove the selected members from it.
- Template variables: subscriber first/last/full name and email, group name, campaign name and start date, organization name, sender email. A subscriber missing a value is skipped at send time.
- Open and click tracking (when `PUBLIC_API_URL` is set): each sent email gets a tracking pixel and signed click links. A campaign shows sent/failed counts plus open and click rates (unique subscribers ÷ emails sent). Opens are approximate: image blocking hides some, and privacy proxies (e.g. Apple Mail) report some that never happened.
- Unsubscribe (when `PUBLIC_API_URL` is set): every email has an unsubscribe footer link and one-click `List-Unsubscribe` headers. Unsubscribing is global and only the subscriber can do it; unsubscribed people stay listed, marked "Unsubscribed", and no campaign sends to them. Campaign stats count unsubscribes.
- Lists paginate by limit/offset with no total count; `/overview` gives counts.
- The organization has one IANA time zone (default UTC). Every date is shown in it, start times are entered in it, and `{{campaign_start_date}}` is rendered in it. Timestamps are absolute instants, so changing the zone never moves a scheduled send.

## Capabilities and Constraints

- Backend: Bun + Hono API (`apps/api`); frontend: Next.js app (`apps/web`) talking to it through a BFF proxy that holds the key in an httpOnly cookie.
- UI controls are hidden or disabled by the key's claims; the server is the authority.
- Not available: bounce/complaint tracking, analytics over time, search endpoints.

## Brand Commitments

Name: "Mail Rocket". No other brand assets are binding (confirmed: start fresh).

## Evidence on Hand

No customers, testimonials or usage statistics. All figures on screen come from the instance's own data.

## Product Principles

1. The next send is always visible: what goes out, when, from which identity.
2. Nothing sends from an unverified identity without the UI saying so plainly.
3. Every screen shows only what the signed-in key can read, and hides actions it can't take.
4. Honest numbers: zeros print as zeros, missing values as a dash, no invented trends.
