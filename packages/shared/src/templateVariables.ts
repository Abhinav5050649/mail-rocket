/**
 * Every `{{variable}}` a campaign's subject line and template body can use.
 * The API keys its resolvers by these names (so a missing resolver is a
 * compile error) and the web app's "Insert variable" menu lists them.
 */
export const TEMPLATE_VARIABLES = [
    { token: "subscriber_first_name", description: "Subscriber's first name" },
    { token: "subscriber_last_name", description: "Subscriber's last name" },
    { token: "subscriber_full_name", description: "Subscriber's full name" },
    { token: "subscriber_email", description: "Subscriber's email address" },
    { token: "group_name", description: "Names of every group the subscriber is in" },
    { token: "campaign_name", description: "Name of the campaign" },
    { token: "campaign_start_date", description: "Campaign start date, in the organization's time zone" },
    { token: "organization_name", description: "Organization name (Settings)" },
    { token: "sender_email", description: "Sending email address" },
] as const;

/** A known variable name, e.g. "subscriber_first_name". */
export type TemplateVariableName = (typeof TEMPLATE_VARIABLES)[number]["token"];
