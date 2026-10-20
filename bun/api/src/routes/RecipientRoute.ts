import { Hono } from "hono";
import { RecipientController } from "../controllers";
import { RecipientService } from "../services";
import { requireAbility } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const recipientService = new RecipientService();
const recipientController = new RecipientController(recipientService);

/**
 * Routes for the `/recipients` resource.
 * Each endpoint requires the key to hold the matching
 * `Recipient` claim (`read` for GETs, `create`/`update`/`delete` for writes).
 *
 * - GET    /              - list all recipients.
 * - POST   /              - create a recipient.
 * - GET    /:recipient_id - fetch a single recipient.
 * - PATCH  /:recipient_id - partially update a recipient.
 * - DELETE /:recipient_id - delete a recipient.
 */
export const recipientRoute = new Hono()
    .get('/', requireAbility('read', 'Recipient'), recipientController.getAll)
    .post('/', requireAbility('create', 'Recipient'), recipientController.post)
    .get('/:recipient_id', requireAbility('read', 'Recipient'), recipientController.get)
    .patch('/:recipient_id', requireAbility('update', 'Recipient'), recipientController.update)
    .delete('/:recipient_id', requireAbility('delete', 'Recipient'), recipientController.delete)

/**
 * Routes for the `/campaigns/:campaign_id/recipients`
 * resource: recipients scoped to a single campaign. Requires the matching
 * `Recipient` claim.
 *
 * - GET  / - list recipients in the campaign.
 * - POST / - create a recipient in the campaign.
 */
export const campaignRecipientRoute = new Hono()
    .get('/', requireAbility('read', 'Recipient'), recipientController.getAllByCampaign)
    .post('/', requireAbility('create', 'Recipient'), recipientController.postByCampaign)

/**
 * Routes for the
 * `/campaigns/:campaign_id/groups/:group_id/recipients`
 * resource: recipients scoped to a single group. Requires the matching
 * `Recipient` claim.
 *
 * - GET  / - list recipients in the group.
 * - POST / - create a recipient in the group.
 */
export const groupRecipientRoute = new Hono()
    .get('/', requireAbility('read', 'Recipient'), recipientController.getAllByGroup)
    .post('/', requireAbility('create', 'Recipient'), recipientController.postByGroup)

/**
 * Routes for `/groups/:group_id/recipients`: a group's members. Membership
 * is many-to-many, so these add or remove an existing recipient rather than
 * creating or deleting one. Listing needs `read Recipient`; changing who is
 * in a group is an edit of the group, so it needs `update Group`.
 *
 * - GET    /              - list the group's members.
 * - POST   /              - add an existing recipient (`{ recipient_id }`).
 * - DELETE /:recipient_id - remove a recipient from the group.
 */
export const groupMembershipRoute = new Hono()
    .get('/', requireAbility('read', 'Recipient'), recipientController.getAllByGroup)
    .post('/', requireAbility('update', 'Group'), recipientController.addToGroup)
    .delete('/:recipient_id', requireAbility('update', 'Group'), recipientController.removeFromGroup)
