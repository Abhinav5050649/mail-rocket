import { Hono } from "hono";
import { authRoute } from "./AuthRoute";
import { userRoute } from "./UserRoute";
import { organizationUserRoute } from "./OrganizationUserRoute";
import { organizationRoute } from "./OrganizationRoute";
import { addressRoute } from "./AddressRoute";
import { contactDetailsRoute } from "./ContactDetailsRoute";
import { identityRoute } from "./IdentityRoute";
import { campaignRoute } from "./CampaignRoute";
import { groupRoute, campaignGroupRoute } from "./GroupRoute";
import { recipientRoute, campaignRecipientRoute, groupRecipientRoute } from "./RecipientRoute";
import { authenticate } from "../middleware";

/**
 * `/auth` is the only resource that doesn't require an `Authorization`
 * header - signup/signin are how a caller gets a token in the first place.
 */
const publicRoute = new Hono()
    .route('/auth', authRoute);

/**
 * Everything else requires authentication. `.use('*', authenticate)` is
 * registered on this `Hono` instance before any `.route(...)` calls are
 * added to it, so it always runs ahead of every route mounted below -
 * relying on registration order across *separate* instances (e.g. adding it
 * to `appRoute` after mounting `publicRoute`) would be fragile, since a
 * matched route's own handler doesn't call `next()` and so never reaches
 * middleware registered after it.
 */
const protectedRoute = new Hono();
protectedRoute.use('*', authenticate);
protectedRoute
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

/**
 * Root route table. Mounts the public and protected route groups above;
 * `index.ts` mounts this whole thing at `/`. Most resources are nested
 * under `/organizations/:organization_id/...` since every table is
 * ultimately scoped to an organization - except `user`, which is
 * many-to-many with organizations via the `organization_user` join table,
 * so `/organizations/:organization_id/users` manages membership rather than
 * the user records themselves (see `OrganizationUserRoute`/`UserRoute`).
 * Groups and recipients additionally get dedicated routes nested under
 * `/campaigns/:campaign_id/...` (and, for recipients, `/groups/:group_id/...`)
 * instead of relying on query-param filters.
 */
export const appRoute = new Hono()
    .route('/', publicRoute)
    .route('/', protectedRoute);
