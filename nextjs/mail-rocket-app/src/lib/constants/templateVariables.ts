/**
 * Mirrors bun/api's `TEMPLATE_VARIABLES` registry (src/libs/templateVariables.ts).
 * Not served by any endpoint, so it's hardcoded here for the "insert
 * variable" picker. If a recipient is missing a value for one of these
 * (e.g. `{{group_name}}` when they aren't in a group), the send pipeline
 * skips that recipient rather than sending a broken email.
 */
export const TEMPLATE_VARIABLES = [
  { token: "recipient_first_name", description: "Recipient's first name" },
  { token: "recipient_last_name", description: "Recipient's last name" },
  { token: "recipient_full_name", description: "Recipient's full name" },
  { token: "recipient_email", description: "Recipient's email address" },
  { token: "group_name", description: "Name of the recipient's group" },
  { token: "campaign_name", description: "Name of the campaign" },
  { token: "campaign_start_date", description: "Campaign start date, in the organization's time zone" },
  { token: "organization_name", description: "Organization name (Settings)" },
  { token: "sender_email", description: "Sending email address" },
] as const;
