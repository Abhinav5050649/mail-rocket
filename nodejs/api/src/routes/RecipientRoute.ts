import { Hono } from "hono";
import { RecipientController } from "../controllers";
import { RecipientService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const recipientService = new RecipientService();
const recipientController = new RecipientController(recipientService);

/**
 * Routes for the `/organizations/:organization_id/recipients` resource.
 *
 * - GET    /              - list recipients in the organization.
 * - POST   /              - create a recipient.
 * - GET    /:recipient_id - fetch a single recipient.
 * - PATCH  /:recipient_id - partially update a recipient.
 * - DELETE /:recipient_id - delete a recipient.
 */
export const recipientRoute = new Hono()
    .get('/', recipientController.getAll)
    .post('/', recipientController.post)
    .get('/:recipient_id', recipientController.get)
    .patch('/:recipient_id', recipientController.update)
    .delete('/:recipient_id', recipientController.delete)

/**
 * Routes for the `/organizations/:organization_id/campaigns/:campaign_id/recipients`
 * resource: recipients scoped to a single campaign.
 *
 * - GET  / - list recipients in the campaign.
 * - POST / - create a recipient in the campaign.
 */
export const campaignRecipientRoute = new Hono()
    .get('/', recipientController.getAllByCampaign)
    .post('/', recipientController.postByCampaign)

/**
 * Routes for the
 * `/organizations/:organization_id/campaigns/:campaign_id/groups/:group_id/recipients`
 * resource: recipients scoped to a single group.
 *
 * - GET  / - list recipients in the group.
 * - POST / - create a recipient in the group.
 */
export const groupRecipientRoute = new Hono()
    .get('/', recipientController.getAllByGroup)
    .post('/', recipientController.postByGroup)
