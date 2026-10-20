import { Hono } from "hono";
import { apiKeyRoute, meRoute } from "./ApiKeyRoute";
import { mcpRoute } from "./McpRoute";
import { overviewRoute } from "./OverviewRoute";
import { organizationRoute } from "./OrganizationRoute";
import { addressRoute } from "./AddressRoute";
import { contactDetailsRoute } from "./ContactDetailsRoute";
import { identityRoute } from "./IdentityRoute";
import { campaignRoute } from "./CampaignRoute";
import { templateRoute, campaignTemplateRoute } from "./TemplateRoute";
import { groupRoute, campaignGroupRoute } from "./GroupRoute";
import { recipientRoute, campaignRecipientRoute, groupRecipientRoute, groupMembershipRoute } from "./RecipientRoute";
import { authenticate } from "../middleware";

/**
 * Root route table; `index.ts` mounts this whole thing at `/`. Every
 * endpoint requires an API key - there are no public routes, since keys are
 * minted at boot or via `bun run key:create`, not through the API. A
 * self-hosted instance has no tenants, so resources live at the top level
 * rather than under an organization. Groups and recipients additionally get
 * dedicated routes nested under `/campaigns/:campaign_id/...` (and, for
 * recipients, `/groups/:group_id/...`) instead of relying on query-param
 * filters. `/mcp` exposes the same operations as MCP tools for AI clients.
 *
 * `.use('*', authenticate)` is registered before any `.route(...)` call, so
 * it always runs ahead of every route mounted below.
 */
export const appRoute = new Hono();
appRoute.use('*', authenticate);
appRoute
    .route('/me', meRoute)
    .route('/keys', apiKeyRoute)
    .route('/mcp', mcpRoute)
    .route('/overview', overviewRoute)
    .route('/organization', organizationRoute)
    .route('/addresses', addressRoute)
    .route('/contact-details', contactDetailsRoute)
    .route('/identities', identityRoute)
    .route('/campaigns', campaignRoute)
    .route('/templates', templateRoute)
    .route('/groups', groupRoute)
    .route('/recipients', recipientRoute)
    .route('/groups/:group_id/recipients', groupMembershipRoute)
    .route('/campaigns/:campaign_id/templates', campaignTemplateRoute)
    .route('/campaigns/:campaign_id/groups', campaignGroupRoute)
    .route('/campaigns/:campaign_id/recipients', campaignRecipientRoute)
    .route('/campaigns/:campaign_id/groups/:group_id/recipients', groupRecipientRoute);
