/**
 * Every `{{variable}}` a campaign's subject line and template body can use.
 * The API keys its resolvers by these names (so a missing resolver is a
 * compile error) and the web app's "Insert variable" menu lists them.
 */
export const TEMPLATE_VARIABLES = [
    { token: "recipient_first_name", description: "Recipient's first name" },
    { token: "recipient_last_name", description: "Recipient's last name" },
    { token: "recipient_full_name", description: "Recipient's full name" },
    { token: "recipient_email", description: "Recipient's email address" },
    { token: "group_name", description: "Names of every group the recipient is in" },
    { token: "campaign_name", description: "Name of the campaign" },
    { token: "campaign_start_date", description: "Campaign start date, in the organization's time zone" },
    { token: "organization_name", description: "Organization name (Settings)" },
    { token: "sender_email", description: "Sending email address" },
] as const;

/** A known variable name, e.g. "recipient_first_name". */
export type TemplateVariableName = (typeof TEMPLATE_VARIABLES)[number]["token"];
