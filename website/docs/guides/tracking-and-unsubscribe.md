---
sidebar_position: 5
title: Tracking and unsubscribe
---

# Tracking and unsubscribe

Both features need the API to be reachable from your subscribers' mail clients. Turn them on by setting two variables in `apps/api/.env`:

```bash
PUBLIC_API_URL=https://api.example.com     # this API's public base URL, no trailing slash
TRACKING_SECRET=<openssl rand -hex 32>     # signs click links; never change it once set
```

Without `PUBLIC_API_URL`, emails go out untouched: no tracking and **no unsubscribe link**. Only do that for local testing.

## Opens and clicks

- **Opens:** a 1×1 pixel goes before `</body>`. Loading it records the subscriber's first open.
- **Clicks:** every absolute `http(s)` link is rewritten through `/track/click`, which records the first click and redirects (302) to the original URL. A click also counts as an open.

Click links carry an HMAC signature of the delivery and URL, so the redirect only goes to links an email actually contained; it can't be used as an open redirect. Changing `TRACKING_SECRET` breaks the links in emails already sent.

Each subscriber counts once. Rates are unique subscribers divided by emails sent.

:::note Opens are approximate
Image blocking hides some opens, and privacy proxies (such as Apple Mail's) report some that never happened. Clicks are more reliable.
:::

The tracking is Mail Rocket's own, not SES's, so it keeps working if sending moves to another provider.

## Unsubscribe

Every email gets:

- a footer: "Don't want these emails? Unsubscribe", linking to `/unsubscribe/:delivery_id`;
- one-click unsubscribe headers (RFC 8058), so mail clients like Gmail show their own Unsubscribe button:

  ```text
  List-Unsubscribe: <https://api.example.com/unsubscribe/…>
  List-Unsubscribe-Post: List-Unsubscribe=One-Click
  ```

These are required by marketing-email law and by the Gmail and Yahoo bulk-sender rules.

Opening the link only shows a confirmation page with an Unsubscribe button, so link scanners that prefetch every URL in an email can't unsubscribe anyone. The button (or the mail client's one-click action) sends a `POST` that does it.

### What unsubscribing does

- It's **global**: no campaign sends to that subscriber again.
- They stay in their groups and lists, marked **Unsubscribed**.
- Only the subscriber can do it. `unsubscribed_at` is read-only through the API, so nobody can opt them back in.
- Campaign stats count unsubscribes per campaign.

The delivery id in the link is a random UUID that only appears in that one person's email; it's the only credential.
