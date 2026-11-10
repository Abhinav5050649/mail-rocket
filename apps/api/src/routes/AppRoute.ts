import { Hono } from "hono";
import { apiKeyRoute, meRoute } from "./ApiKeyRoute";
import { overviewRoute } from "./OverviewRoute";
import { organizationRoute } from "./OrganizationRoute";
import { addressRoute } from "./AddressRoute";
import { contactDetailsRoute } from "./ContactDetailsRoute";
import { identityRoute } from "./IdentityRoute";
import { campaignRoute } from "./CampaignRoute";
import { templateRoute } from "./TemplateRoute";
import { groupRoute, campaignGroupRoute } from "./GroupRoute";
import { subscriberRoute, campaignSubscriberRoute, groupMembershipRoute } from "./SubscriberRoute";
import { trackingRoute } from "./TrackingRoute";
import { unsubscribeRoute } from "./UnsubscribeRoute";
import { authenticate } from "../middleware";

/**
 * Root route table; `index.ts` mounts this whole thing at `/`. Every
 * endpoint requires an API key (keys are minted at boot or via
 * `bun run key:create`, not through the API), except `/track` and
 * `/unsubscribe`: the open/click tracking and unsubscribe links that
 * subscribers reach from their mail. A
 * self-hosted instance has no tenants, so resources live at the top level
 * rather than under an organization. Templates, groups and subscribers are
 * shared libraries; a campaign picks its template and audience in its own
 * body, and read-only views of its groups and audience live under
 * `/campaigns/:campaign_id/...`. A group's members are managed under
 * `/groups/:group_id/subscribers`.
 *
 * `/track` and `/unsubscribe` are mounted before `.use('*', authenticate)`:
 * Hono runs handlers in registration order and their handlers answer
 * without calling `next`, so `authenticate` never runs for them.
 * `authenticate` is registered before every other `.route(...)` call, so it
 * always runs ahead of those.
 */
export const appRoute = new Hono();
appRoute.route('/track', trackingRoute);
appRoute.route('/unsubscribe', unsubscribeRoute);
appRoute.use('*', authenticate);
appRoute
    .route('/me', meRoute)
    .route('/keys', apiKeyRoute)
    .route('/overview', overviewRoute)
    .route('/organization', organizationRoute)
    .route('/addresses', addressRoute)
    .route('/contact-details', contactDetailsRoute)
    .route('/identities', identityRoute)
    .route('/campaigns', campaignRoute)
    .route('/templates', templateRoute)
    .route('/groups', groupRoute)
    .route('/subscribers', subscriberRoute)
    .route('/groups/:group_id/subscribers', groupMembershipRoute)
    .route('/campaigns/:campaign_id/groups', campaignGroupRoute)
    .route('/campaigns/:campaign_id/subscribers', campaignSubscriberRoute);
