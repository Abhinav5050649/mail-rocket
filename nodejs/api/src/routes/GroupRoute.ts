import { Hono } from "hono";
import { GroupController } from "../controllers";
import { GroupService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const groupService = new GroupService();
const groupController = new GroupController(groupService);

/**
 * Routes for the `/organizations/:organization_id/groups` resource.
 *
 * - GET    /          - list groups in the organization.
 * - POST   /          - create a group.
 * - GET    /:group_id - fetch a single group.
 * - PATCH  /:group_id - partially update a group.
 * - DELETE /:group_id - delete a group.
 */
export const groupRoute = new Hono()
    .get('/', groupController.getAll)
    .post('/', groupController.post)
    .get('/:group_id', groupController.get)
    .patch('/:group_id', groupController.update)
    .delete('/:group_id', groupController.delete)

/**
 * Routes for the `/organizations/:organization_id/campaigns/:campaign_id/groups`
 * resource: groups scoped to a single campaign.
 *
 * - GET  / - list groups in the campaign.
 * - POST / - create a group in the campaign.
 */
export const campaignGroupRoute = new Hono()
    .get('/', groupController.getAllByCampaign)
    .post('/', groupController.postByCampaign)
