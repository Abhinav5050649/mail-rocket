/**
 * Support for `{{variable_name}}` placeholders inside a campaign's subject
 * line and template `html_body`. Every variable this codebase knows how to
 * fill in is registered in `TEMPLATE_VARIABLES` below, resolved from data
 * `SendCampaignService` already has on hand for a recipient's send - no
 * separate "merge fields" table. Placeholders whose value isn't available
 * are reported back so the caller can skip sending that recipient rather
 * than mail out literal `{{...}}` text.
 *
 * See `docs/TEMPLATE_VARIABLES.md` for the user-facing list - keep it in
 * sync with `TEMPLATE_VARIABLES` below.
 */

import { DEFAULT_TIME_ZONE } from "./timeZones";

/** Data available when resolving template variables for one recipient's send. */
export interface TemplateVariableContext {
    recipient: {
        first_name: string | null;
        last_name: string | null;
        email_id: string | null;
    };
    /** The recipient's groups; `name` is all their names, comma-separated. Null when in none. */
    group: {
        name: string | null;
    } | null;
    campaign: {
        name: string | null;
        start_time: Date | null;
    };
    /** The organization running this instance (its single `organization` row). */
    organization: {
        name: string | null;
        /** IANA time zone dates are rendered in. */
        timezone: string;
    } | null;
    /** The SES sending identity the campaign sends from. */
    sender: {
        email: string | null;
    };
}

type VariableResolver = (context: TemplateVariableContext) => string | null | undefined;

/** Joins name parts with a space, skipping blanks; null if nothing was usable. */
const joinName = (...parts: (string | null | undefined)[]): string | null => {
    const usable = parts.filter((part): part is string => !!part && part.trim().length > 0);
    return usable.length > 0 ? usable.join(" ") : null;
};

/**
 * Every placeholder a campaign's subject/template body can reference, and
 * how to resolve it from a `TemplateVariableContext`. To support a new
 * variable, add a resolver here (and to `docs/TEMPLATE_VARIABLES.md`) -
 * never invent one that isn't registered.
 */
export const TEMPLATE_VARIABLES: Record<string, VariableResolver> = {
    recipient_first_name: (ctx) => ctx.recipient.first_name,
    recipient_last_name: (ctx) => ctx.recipient.last_name,
    recipient_full_name: (ctx) => joinName(ctx.recipient.first_name, ctx.recipient.last_name),
    recipient_email: (ctx) => ctx.recipient.email_id,
    group_name: (ctx) => ctx.group?.name,
    campaign_name: (ctx) => ctx.campaign.name,
    // The calendar date in the organization's time zone: a 23:30 UTC send is "tomorrow" in Asia/Kolkata.
    campaign_start_date: (ctx) => ctx.campaign.start_time?.toLocaleDateString(undefined, { timeZone: ctx.organization?.timezone ?? DEFAULT_TIME_ZONE }) ?? null,
    organization_name: (ctx) => ctx.organization?.name,
    sender_email: (ctx) => ctx.sender.email,
};

/** Matches `{{variable_name}}`, tolerating extra whitespace inside the braces. */
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** The result of rendering one piece of template text against a context. */
export interface RenderResult {
    /** `text` with every resolvable placeholder substituted. */
    rendered: string;
    /** Deduplicated names of placeholders left unresolved (unknown name, or no value for this recipient). */
    missing: string[];
}

/**
 * Replaces every `{{variable_name}}` placeholder in `text` with its resolved
 * value from `context`. A placeholder naming an unknown variable, or whose
 * resolver returns null/undefined/empty for this recipient, is left as-is in
 * `rendered` and its name is reported in `missing` - callers should treat a
 * non-empty `missing` as "don't send this recipient this text".
 *
 * @param text - Raw subject or `html_body` text, possibly containing `{{...}}` placeholders.
 * @param context - Data resolved for the specific recipient/campaign being sent.
 */
export function renderTemplate(text: string, context: TemplateVariableContext): RenderResult {
    const missing = new Set<string>();

    const rendered = text.replace(PLACEHOLDER_PATTERN, (fullMatch, name: string) => {
        const resolver = TEMPLATE_VARIABLES[name];
        const value = resolver?.(context);

        if (!resolver || value === null || value === undefined || value === "") {
            missing.add(name);
            return fullMatch;
        }

        return value;
    });

    return { rendered, missing: [...missing] };
}
