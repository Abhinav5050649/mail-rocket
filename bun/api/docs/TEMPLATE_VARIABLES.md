# Campaign template variables

A campaign's **subject** and its template's **HTML body** can both contain
`{{variable_name}}` placeholders. At send time (`SendCampaignService.sendChunk`,
see [ARCHITECTURE.md § 6](ARCHITECTURE.md#6-campaign-send-pipeline)), each
placeholder is replaced with a value resolved for that specific recipient.

The registry of supported names and their resolvers lives in
[`src/libs/templateVariables.ts`](../src/libs/templateVariables.ts) - this
file is a description of that registry, kept in sync with it.

## Supported variables

| Variable | Resolves to | Source |
| --- | --- | --- |
| `{{recipient_first_name}}` | Recipient's first name | `recipients.first_name` |
| `{{recipient_last_name}}` | Recipient's last name | `recipients.last_name` |
| `{{recipient_full_name}}` | First + last name, joined with a space (whichever parts exist) | `recipients.first_name` / `.last_name` |
| `{{recipient_email}}` | Recipient's email address | `recipients.email_id` |
| `{{group_name}}` | Name of the group the recipient belongs to | `group.name` |
| `{{campaign_name}}` | Name of the campaign | `campaign.name` |
| `{{campaign_start_date}}` | Campaign's scheduled/actual start date | `campaign.start_time` |
| `{{organization_name}}` | Name of the organization running the campaign | `organization.name` |
| `{{organizer_first_name}}` | First name of the user who organized the campaign | `user.first_name` |
| `{{organizer_last_name}}` | Last name of the user who organized the campaign | `user.last_name` |
| `{{organizer_full_name}}` | Organizer's first + last name | `user.first_name` / `.last_name` |
| `{{organizer_email}}` | Organizer's login email | `user.email` |
| `{{sender_email}}` | The verified SES identity the campaign sends from | `identity.identity` |

## Behavior on missing values

A placeholder is considered **unresolved** for a recipient when either:

- it names a variable that isn't in the table above, or
- the variable is recognized, but the underlying value is `null`, missing, or an empty string for that specific recipient (e.g. a recipient row with no `first_name`, or a recipient not in a group when the template uses `{{group_name}}`).

When any placeholder in the subject or body is unresolved for a recipient,
**that recipient is not sent an email**. Their `campaign_recipient` row is
marked `send_status: 'failed'` with `description` set to the list of missing
variable names, and the rest of the chunk's recipients are sent normally.
The unresolved-variable names are also logged at `warn` level
(`campaignId`, `campaignRecipientId`, `missing`) for debugging.

## Adding a new variable

1. Add a resolver to `TEMPLATE_VARIABLES` in
   [`src/libs/templateVariables.ts`](../src/libs/templateVariables.ts). It
   receives a `TemplateVariableContext` (whatever `sendChunk` already knows
   about the campaign/recipient/organization/etc.) and returns a `string`,
   or `null`/`undefined` if unavailable for this recipient.
2. If the variable needs data `sendChunk` doesn't already fetch, extend the
   query/lookups there and thread it into the `TemplateVariableContext` built
   per recipient.
3. Add a row to the table above.
