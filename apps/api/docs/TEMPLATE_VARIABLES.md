# Campaign template variables

A campaign's **subject** and its template's **HTML body** can both contain
`{{variable_name}}` placeholders. At send time (`SendCampaignService.sendChunk`,
see [ARCHITECTURE.md § 6](ARCHITECTURE.md#6-campaign-send-pipeline)), each
placeholder is replaced with a value resolved for that specific subscriber.

The registry of supported names and their resolvers lives in
[`src/libs/templateVariables.ts`](../src/libs/templateVariables.ts) - this
file is a description of that registry, kept in sync with it.

## Supported variables

| Variable | Resolves to | Source |
| --- | --- | --- |
| `{{subscriber_first_name}}` | Subscriber's first name | `subscribers.first_name` |
| `{{subscriber_last_name}}` | Subscriber's last name | `subscribers.last_name` |
| `{{subscriber_full_name}}` | First + last name, joined with a space (whichever parts exist) | `subscribers.first_name` / `.last_name` |
| `{{subscriber_email}}` | Subscriber's email address | `subscribers.email_id` |
| `{{group_name}}` | Names of every group the subscriber is in, alphabetical and comma-separated (e.g. "Newsletter subscribers, VIP customers") | `group.name` via `group_subscriber` |
| `{{campaign_name}}` | Name of the campaign | `campaign.name` |
| `{{campaign_start_date}}` | Campaign's scheduled/actual start date, as the calendar date in the organization's time zone | `campaign.start_time` |
| `{{organization_name}}` | Name of the organization running this instance (set via `PATCH /organization`) | `organization.name` (the single row) |
| `{{sender_email}}` | The address the campaign sends from (without the display name) | `identity.identity` for an email identity, `<campaign.from_local_part>@<identity.identity>` for a domain one |

## Behavior on missing values

A placeholder is considered **unresolved** for a subscriber when either:

- it names a variable that isn't in the table above, or
- the variable is recognized, but the underlying value is `null`, missing, or an empty string for that specific subscriber (e.g. a subscriber row with no `first_name`, or a subscriber not in a group when the template uses `{{group_name}}`).

When any placeholder in the subject or body is unresolved for a subscriber,
**that subscriber is not sent an email**. Their `campaign_delivery` row is
marked `status: 'failed'` with `description` set to the list of missing
variable names, and the rest of the chunk's subscribers are sent normally.
The unresolved-variable names are also logged at `warn` level
(`campaignId`, `deliveryId`, `missing`) for debugging.

## Adding a new variable

1. Add its name and description to `TEMPLATE_VARIABLES` in
   [`packages/shared/src/templateVariables.ts`](../../../packages/shared/src/templateVariables.ts)
   (the web app's "Insert variable" menu reads it), then add its resolver to
   `TEMPLATE_VARIABLES` in
   [`src/libs/templateVariables.ts`](../src/libs/templateVariables.ts) - the
   API won't compile until every shared name has one. It
   receives a `TemplateVariableContext` (whatever `sendChunk` already knows
   about the campaign/subscriber/organization/etc.) and returns a `string`,
   or `null`/`undefined` if unavailable for this subscriber.
2. If the variable needs data `sendChunk` doesn't already fetch, extend the
   query/lookups there and thread it into the `TemplateVariableContext` built
   per subscriber.
3. Add a row to the table above.

> The `organizer_*` variables were removed along with users: an instance has
> no users, so a campaign has no organizer. A template that still uses one
> now fails every subscriber with that variable reported as missing.
