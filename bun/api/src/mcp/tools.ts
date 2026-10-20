import { z } from "zod";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { keyCreateSchema, keyPatchSchema, resolveClaims, ValidationError, type Action, type Subject } from "../libs";
import type { Principal } from "../middleware/authenticate";
import {
    AddressService,
    ApiKeyService,
    CampaignService,
    ContactDetailsService,
    GroupService,
    IdentityService,
    OrganizationService,
    RecipientService,
    TemplateService,
} from "../services";
// Imported from the file, not the controllers barrel: the barrel also exports
// McpController, which imports this module - a cycle.
import { toApiKeyResponse } from "../controllers/ApiKeyController";

// Wired up once per process, same as the singleton services in each *Route.ts file.
const organizationService = new OrganizationService();
const addressService = new AddressService();
const contactDetailsService = new ContactDetailsService();
const identityService = new IdentityService();
const campaignService = new CampaignService();
const templateService = new TemplateService();
const groupService = new GroupService();
const recipientService = new RecipientService();
const apiKeyService = new ApiKeyService();

/**
 * An expected failure a tool reports back to the AI client as a tool error
 * (`isError: true`) with this message - the MCP counterpart of a controller's
 * 4xx `HTTPException`. Anything else thrown is treated as unexpected.
 */
export class McpToolError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "McpToolError";
    }
}

/** One MCP tool: its schema, the CASL claim it needs, and what it does. */
export interface McpToolDefinition {
    name: string;
    title: string;
    description: string;
    /** Claim the calling key must hold for the tool to be listed or run; null = any valid key. */
    claim: { action: Action; subject: Subject } | null;
    inputSchema: z.ZodRawShape;
    annotations: ToolAnnotations;
    /** Returns the data to send back as the tool result; throws `McpToolError` for expected failures. */
    handler: (args: Record<string, unknown>, principal: Principal) => Promise<unknown>;
}

/**
 * Declares a tool with its handler typed from its own input schema. Erases
 * the schema type afterwards so every tool fits in one `McpToolDefinition[]`
 * (the SDK has already validated `args` against `inputSchema` before the
 * handler runs).
 */
const defineTool = <Shape extends z.ZodRawShape>(tool: Omit<McpToolDefinition, "inputSchema" | "handler"> & {
    inputSchema: Shape;
    handler: (args: z.infer<z.ZodObject<Shape>>, principal: Principal) => Promise<unknown>;
}): McpToolDefinition => tool as unknown as McpToolDefinition;

/** Returns `row`, or throws a "not found" tool error naming the entity. */
const found = <Row>(row: Row | null, entity: string): Row => {
    if (!row) throw new McpToolError(`${entity} not found`);
    return row;
};

/** The instance's single organization; throws if boot never seeded it. */
const organizationId = async () => found(await organizationService.get(), "Organization").id;

/** Converts an ISO datetime argument to a `Date`, keeping `null` (clear) and `undefined` (leave untouched). */
const toDate = (value: string | null | undefined) => (value === undefined ? undefined : value === null ? null : new Date(value));

// Shared input fields.
const id = (entity: string) => z.string().min(1).describe(`ID of the ${entity}.`);
const page = {
    limit: z.number().int().min(1).max(100).optional().describe("Maximum rows to return (default 10, max 100)."),
    offset: z.number().int().min(0).optional().describe("Rows to skip before returning results (default 0)."),
};
const description = z.string().optional().describe("Free-text notes about the record.");
const isoDate = z.iso.datetime({ offset: true });

const READ: ToolAnnotations = { readOnlyHint: true, openWorldHint: false };
const CREATE: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const UPDATE: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const DELETE: ToolAnnotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };

/**
 * Builds the standard get/update/delete trio for a resource whose service
 * exposes `getById`/`update`/`delete` - list and create differ per resource
 * (filters, parent ids), so they're declared by hand below.
 */
const getUpdateDelete = <UpdateShape extends z.ZodRawShape>(opts: {
    subject: Subject;
    /** snake_case singular used in tool names, e.g. `contact_details`. */
    name: string;
    /** Human-readable singular, e.g. "Contact details". */
    label: string;
    service: { getById(id: string): Promise<unknown>; update(id: string, data: never): Promise<unknown>; delete(id: string): Promise<unknown> };
    updateShape: UpdateShape;
    /** Maps validated update args to the service's update input (e.g. ISO strings to Dates). */
    toUpdate?: (args: z.infer<z.ZodObject<UpdateShape>>) => unknown;
}): McpToolDefinition[] => {
    const idField = `${opts.name}_id`;
    return [
        defineTool({
            name: `get_${opts.name}`,
            title: `Get ${opts.label}`,
            description: `Fetches a single ${opts.label.toLowerCase()} by id.`,
            claim: { action: "read", subject: opts.subject },
            inputSchema: { [idField]: id(opts.label.toLowerCase()) },
            annotations: READ,
            handler: async (args) => found(await opts.service.getById(args[idField] as string), opts.label),
        }),
        defineTool({
            name: `update_${opts.name}`,
            title: `Update ${opts.label}`,
            description: `Partially updates a ${opts.label.toLowerCase()}; omitted fields are left unchanged.`,
            claim: { action: "update", subject: opts.subject },
            inputSchema: { [idField]: id(opts.label.toLowerCase()), ...opts.updateShape },
            annotations: UPDATE,
            handler: async (args) => {
                const { [idField]: rowId, ...rest } = args as Record<string, unknown>;
                const data = opts.toUpdate ? opts.toUpdate(rest as z.infer<z.ZodObject<UpdateShape>>) : rest;
                return found(await opts.service.update(rowId as string, data as never), opts.label);
            },
        }),
        defineTool({
            name: `delete_${opts.name}`,
            title: `Delete ${opts.label}`,
            description: `Permanently deletes a ${opts.label.toLowerCase()}.`,
            claim: { action: "delete", subject: opts.subject },
            inputSchema: { [idField]: id(opts.label.toLowerCase()) },
            annotations: DELETE,
            handler: async (args) => found(await opts.service.delete(args[idField] as string), opts.label),
        }),
    ];
};

// --- Field sets, mirroring each service's Create/Update input --------------

const addressFields = {
    street: z.string().optional(),
    area: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
    is_primary: z.boolean().optional().describe("Whether this is the organization's primary address."),
    description,
};
const contactDetailsFields = {
    email_id: z.string().optional().describe("Email address."),
    country_code: z.string().optional().describe("Phone country code, e.g. +1."),
    phone_number: z.string().optional(),
    description,
};
const campaignFields = {
    name: z.string().optional(),
    subject: z.string().optional().describe("Email subject line; may use {{variable}} placeholders."),
    logo_key: z.string().optional(),
    logo_bucket: z.string().optional(),
    identity_id: z.string().optional().describe("ID of the active email identity to send from."),
    normalized_name: z.string().optional(),
    description,
};
const templateFields = {
    name: z.string().optional(),
    html_body: z.string().optional().describe("HTML body of the email; may use {{variable}} placeholders."),
    normalized_name: z.string().optional(),
    description,
};
const groupFields = { name: z.string().optional(), normalized_name: z.string().optional(), description };
const recipientFields = {
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email_id: z.string().optional().describe("Recipient's email address."),
    normalized_name: z.string().optional(),
    description,
};

/**
 * Every tool the MCP endpoint offers - parity with the REST API. Each one
 * requires the same CASL claim as its REST route, and is only listed to a
 * key holding it. Lifecycle fields the system manages itself (campaign and
 * identity `status`) are deliberately not settable: scheduling is driven by
 * `start_time`, and identity status by SES verification.
 */
export const MCP_TOOLS: McpToolDefinition[] = [
    // --- The calling key ----------------------------------------------------
    defineTool({
        name: "get_me",
        title: "Get calling key",
        description: "Returns the API key this session authenticates with, including its claims - what this client is allowed to do.",
        claim: null,
        inputSchema: {},
        annotations: READ,
        handler: async (_args, principal) => toApiKeyResponse(found(await apiKeyService.getById(principal.keyId), "API key")),
    }),

    // --- Organization (single row) -----------------------------------------
    defineTool({
        name: "get_organization",
        title: "Get organization",
        description: "Fetches the profile of the organization running this instance. Its name fills {{organization_name}}.",
        claim: { action: "read", subject: "Organization" },
        inputSchema: {},
        annotations: READ,
        handler: async () => found(await organizationService.get(), "Organization"),
    }),
    defineTool({
        name: "update_organization",
        title: "Update organization",
        description: "Partially updates the organization's profile.",
        claim: { action: "update", subject: "Organization" },
        inputSchema: { name: z.string().optional(), normalized_name: z.string().optional(), description },
        annotations: UPDATE,
        handler: async (args) => found(await organizationService.update(args), "Organization"),
    }),

    // --- Addresses ----------------------------------------------------------
    defineTool({
        name: "list_addresses",
        title: "List addresses",
        description: "Lists the organization's postal addresses.",
        claim: { action: "read", subject: "Address" },
        inputSchema: { is_primary: z.boolean().optional().describe("Only primary (true) or non-primary (false) addresses."), ...page },
        annotations: READ,
        handler: async ({ is_primary, limit, offset }) =>
            addressService.getByOrganization(await organizationId(), { isPrimary: is_primary, limit, offset }),
    }),
    defineTool({
        name: "create_address",
        title: "Create address",
        description: "Adds a postal address to the organization.",
        claim: { action: "create", subject: "Address" },
        inputSchema: addressFields,
        annotations: CREATE,
        handler: async (args) => addressService.create({ ...args, organization_id: await organizationId() }),
    }),
    ...getUpdateDelete({ subject: "Address", name: "address", label: "Address", service: addressService, updateShape: addressFields }),

    // --- Contact details ----------------------------------------------------
    defineTool({
        name: "list_contact_details",
        title: "List contact details",
        description: "Lists the organization's email/phone contact details.",
        claim: { action: "read", subject: "ContactDetails" },
        inputSchema: page,
        annotations: READ,
        handler: async ({ limit, offset }) => contactDetailsService.getByOrganization(await organizationId(), { limit, offset }),
    }),
    defineTool({
        name: "create_contact_details",
        title: "Create contact details",
        description: "Adds an email/phone contact to the organization.",
        claim: { action: "create", subject: "ContactDetails" },
        inputSchema: contactDetailsFields,
        annotations: CREATE,
        handler: async (args) => contactDetailsService.create({ ...args, organization_id: await organizationId() }),
    }),
    ...getUpdateDelete({ subject: "ContactDetails", name: "contact_details", label: "Contact details", service: contactDetailsService, updateShape: contactDetailsFields }),

    // --- Identities ---------------------------------------------------------
    defineTool({
        name: "list_identities",
        title: "List identities",
        description: "Lists SES sending identities (domains and email addresses).",
        claim: { action: "read", subject: "Identity" },
        inputSchema: {
            type: z.enum(["domain", "email"]).optional(),
            status: z.enum(["created", "pending", "active"]).optional().describe("Only 'active' identities can send."),
            ...page,
        },
        annotations: READ,
        handler: async (args) => identityService.getAll(args),
    }),
    defineTool({
        name: "create_identity",
        title: "Create identity",
        description: "Registers a domain or email address with AWS SES for sending. Domains return DNS records to add; verification then completes in the background.",
        claim: { action: "create", subject: "Identity" },
        inputSchema: {
            type: z.enum(["domain", "email"]),
            identity: z.string().min(1).describe("The domain name or email address."),
            description,
        },
        // Calls out to AWS SES.
        annotations: { ...CREATE, openWorldHint: true },
        handler: async (args) => identityService.create(args),
    }),
    ...getUpdateDelete({ subject: "Identity", name: "identity", label: "Identity", service: identityService, updateShape: { description } }),

    // --- Campaigns ----------------------------------------------------------
    defineTool({
        name: "list_campaigns",
        title: "List campaigns",
        description: "Lists campaigns, optionally filtered by status.",
        claim: { action: "read", subject: "Campaign" },
        inputSchema: { status: z.enum(["draft", "scheduled", "sending", "sent", "failed"]).optional(), ...page },
        annotations: READ,
        handler: async (args) => campaignService.getAll(args),
    }),
    defineTool({
        name: "create_campaign",
        title: "Create campaign",
        description: "Creates a campaign. Giving a start_time schedules the send for that moment (status becomes 'scheduled'), so set identity_id, a template and recipients first.",
        claim: { action: "create", subject: "Campaign" },
        inputSchema: { ...campaignFields, start_time: isoDate.optional().describe("ISO 8601 datetime to send at.") },
        annotations: CREATE,
        handler: async ({ start_time, ...rest }) => campaignService.create({ ...rest, start_time: toDate(start_time) ?? undefined }),
    }),
    ...getUpdateDelete({
        subject: "Campaign",
        name: "campaign",
        label: "Campaign",
        service: campaignService,
        updateShape: { ...campaignFields, start_time: isoDate.nullable().optional().describe("ISO 8601 datetime to (re)schedule the send; null unschedules a draft/scheduled campaign.") },
        toUpdate: ({ start_time, ...rest }) => (start_time === undefined ? rest : { ...rest, start_time: toDate(start_time) }),
    }),

    // --- Templates ----------------------------------------------------------
    defineTool({
        name: "list_templates",
        title: "List templates",
        description: "Lists templates - all of them, or only one campaign's. A campaign sends its most recently updated template.",
        claim: { action: "read", subject: "Template" },
        inputSchema: { campaign_id: z.string().optional().describe("Only this campaign's templates."), ...page },
        annotations: READ,
        handler: async ({ campaign_id, ...options }) => (campaign_id ? templateService.getByCampaign(campaign_id, options) : templateService.getAll(options)),
    }),
    defineTool({
        name: "create_template",
        title: "Create template",
        description: "Creates an email template, optionally attached to a campaign.",
        claim: { action: "create", subject: "Template" },
        inputSchema: { ...templateFields, campaign_id: z.string().optional().describe("Campaign to attach the template to.") },
        annotations: CREATE,
        handler: async (args) => templateService.create(args),
    }),
    ...getUpdateDelete({ subject: "Template", name: "template", label: "Template", service: templateService, updateShape: templateFields }),

    // --- Groups -------------------------------------------------------------
    defineTool({
        name: "list_groups",
        title: "List groups",
        description: "Lists recipient groups - all of them, or only one campaign's.",
        claim: { action: "read", subject: "Group" },
        inputSchema: { campaign_id: z.string().optional().describe("Only this campaign's groups."), ...page },
        annotations: READ,
        handler: async ({ campaign_id, ...options }) => (campaign_id ? groupService.getByCampaign(campaign_id, options) : groupService.getAll(options)),
    }),
    defineTool({
        name: "create_group",
        title: "Create group",
        description: "Creates a recipient group, optionally within a campaign.",
        claim: { action: "create", subject: "Group" },
        inputSchema: { ...groupFields, campaign_id: z.string().optional().describe("Campaign the group belongs to.") },
        annotations: CREATE,
        handler: async (args) => groupService.create(args),
    }),
    ...getUpdateDelete({ subject: "Group", name: "group", label: "Group", service: groupService, updateShape: groupFields }),

    // --- Recipients ---------------------------------------------------------
    defineTool({
        name: "list_recipients",
        title: "List recipients",
        description: "Lists recipients - all of them, one campaign's, or one group's (group_id wins if both are given).",
        claim: { action: "read", subject: "Recipient" },
        inputSchema: {
            campaign_id: z.string().optional().describe("Only this campaign's recipients."),
            group_id: z.string().optional().describe("Only this group's recipients."),
            ...page,
        },
        annotations: READ,
        handler: async ({ campaign_id, group_id, ...options }) =>
            group_id ? recipientService.getByGroup(group_id, options)
                : campaign_id ? recipientService.getByCampaign(campaign_id, options)
                    : recipientService.getAll(options),
    }),
    defineTool({
        name: "create_recipient",
        title: "Create recipient",
        description: "Adds a recipient, optionally to a campaign and/or a group.",
        claim: { action: "create", subject: "Recipient" },
        inputSchema: {
            ...recipientFields,
            campaign_id: z.string().optional().describe("Campaign the recipient is targeted by."),
            group_id: z.string().optional().describe("Group the recipient belongs to."),
        },
        annotations: CREATE,
        handler: async (args) => recipientService.create(args),
    }),
    ...getUpdateDelete({ subject: "Recipient", name: "recipient", label: "Recipient", service: recipientService, updateShape: recipientFields }),

    // --- API keys -----------------------------------------------------------
    defineTool({
        name: "list_keys",
        title: "List API keys",
        description: "Lists API keys, newest first. Without the `create Key` claim only id, name, claims and preset are returned.",
        claim: { action: "read", subject: "Key" },
        inputSchema: page,
        annotations: READ,
        handler: async (args, principal) => {
            const canManage = principal.ability.can("create", "Key");
            return (await apiKeyService.getAll(args)).map((row) => {
                const key = toApiKeyResponse(row);
                return canManage ? key : { id: key.id, name: key.name, claims: key.claims, preset: key.preset };
            });
        },
    }),
    defineTool({
        name: "get_key",
        title: "Get API key",
        description: "Fetches a single API key (never its secret).",
        claim: { action: "read", subject: "Key" },
        inputSchema: { key_id: id("API key") },
        annotations: READ,
        handler: async ({ key_id }) => toApiKeyResponse(found(await apiKeyService.getById(key_id), "API key")),
    }),
    defineTool({
        name: "create_key",
        title: "Create API key",
        description: "Mints an API key from a preset (viewer, editor, admin) or an explicit claims list - exactly one of the two. The result contains the secret; it is shown only this once.",
        claim: { action: "create", subject: "Key" },
        inputSchema: keyCreateSchema.shape,
        annotations: CREATE,
        handler: async (args) => {
            // Re-parse with the full schema for its "exactly one of preset or claims" rule.
            const body = parseOrThrow(keyCreateSchema, args);
            const { apiKey, secret } = await apiKeyService.create({
                name: body.name,
                claims: resolveClaims(body)!,
                expires_at: body.expires_at ? new Date(body.expires_at) : null,
                description: body.description,
            });
            return { ...toApiKeyResponse(apiKey), secret };
        },
    }),
    defineTool({
        name: "update_key",
        title: "Update API key",
        description: "Updates an API key's name, claims (via preset or claims, not both), expiry (null clears it) or description. A key cannot change its own claims.",
        claim: { action: "update", subject: "Key" },
        inputSchema: { key_id: id("API key"), ...keyPatchSchema.shape },
        annotations: UPDATE,
        handler: async ({ key_id, ...rest }, principal) => {
            const body = parseOrThrow(keyPatchSchema, rest);
            const claims = resolveClaims(body);
            // Same self-guard as ApiKeyController.update: never lock the session out of its own access.
            if (claims !== undefined && key_id === principal.keyId) {
                throw new McpToolError("You cannot change the claims of the key you are using");
            }
            const apiKey = await apiKeyService.update(key_id, {
                name: body.name,
                claims,
                expires_at: toDate(body.expires_at),
                description: body.description,
            });
            return toApiKeyResponse(found(apiKey, "API key"));
        },
    }),
    defineTool({
        name: "delete_key",
        title: "Revoke API key",
        description: "Revokes (permanently deletes) an API key; anything using it loses access immediately. A key cannot revoke itself.",
        claim: { action: "delete", subject: "Key" },
        inputSchema: { key_id: id("API key") },
        annotations: DELETE,
        handler: async ({ key_id }, principal) => {
            // Same self-guard as ApiKeyController.delete.
            if (key_id === principal.keyId) throw new McpToolError("You cannot revoke the key you are using");
            return toApiKeyResponse(found(await apiKeyService.delete(key_id), "API key"));
        },
    }),
];

/**
 * Parses `value` against a refined schema whose cross-field rules the SDK's
 * per-field validation can't express.
 *
 * @throws {McpToolError} with the first issue's message.
 */
function parseOrThrow<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
    const result = schema.safeParse(value);
    if (!result.success) {
        const issue = result.error.issues[0]!;
        // Prefixes the field path when the issue is about a specific field.
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        throw new McpToolError(`${path}${issue.message}`);
    }
    return result.data;
}

/** Errors whose message is safe and useful to show the AI client. */
export const isExpectedToolError = (error: unknown): error is Error => error instanceof McpToolError || error instanceof ValidationError;
