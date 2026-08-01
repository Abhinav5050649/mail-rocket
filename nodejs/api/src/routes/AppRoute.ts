import { Hono } from "hono";
import { userRoute } from "./UserRoute";
import { organizationUserRoute } from "./OrganizationUserRoute";
import { organizationRoute } from "./OrganizationRoute";
import { addressRoute } from "./AddressRoute";
import { contactDetailsRoute } from "./ContactDetailsRoute";
import { identityRoute } from "./IdentityRoute";
import { campaignRoute } from "./CampaignRoute";
import { groupRoute, campaignGroupRoute } from "./GroupRoute";
import { recipientRoute, campaignRecipientRoute, groupRecipientRoute } from "./RecipientRoute";

/**
 * Root route table. Mounts every feature's sub-router under its resource
 * prefix; `index.ts` mounts this whole thing at `/`. Most resources are
 * nested under `/organizations/:organization_id/...` since every table is
 * ultimately scoped to an organization - except `user`, which is
 * many-to-many with organizations via the `organization_user` join table,
 * so `/organizations/:organization_id/users` manages membership rather than
 * the user records themselves (see `OrganizationUserRoute`/`UserRoute`).
 * Groups and recipients additionally get dedicated routes nested under
 * `/campaigns/:campaign_id/...` (and, for recipients, `/groups/:group_id/...`)
 * instead of relying on query-param filters.
 */
export const appRoute = new Hono()
    .route('/users', userRoute)
    .route('/organizations', organizationRoute)
    .route('/organizations/:organization_id/users', organizationUserRoute)
    .route('/organizations/:organization_id/addresses', addressRoute)
    .route('/organizations/:organization_id/contact-details', contactDetailsRoute)
    .route('/organizations/:organization_id/identities', identityRoute)
    .route('/organizations/:organization_id/campaigns', campaignRoute)
    .route('/organizations/:organization_id/groups', groupRoute)
    .route('/organizations/:organization_id/recipients', recipientRoute)
    .route('/organizations/:organization_id/campaigns/:campaign_id/groups', campaignGroupRoute)
    .route('/organizations/:organization_id/campaigns/:campaign_id/recipients', campaignRecipientRoute)
    .route('/organizations/:organization_id/campaigns/:campaign_id/groups/:group_id/recipients', groupRecipientRoute);
