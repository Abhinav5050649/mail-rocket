import { Hono } from "hono";
import { GroupController } from "../controllers";
import { GroupService } from "../services";
import { requireRole } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const groupService = new GroupService();
const groupController = new GroupController(groupService);

/**
 * Routes for the `/organizations/:organization_id/groups` resource.
 * Reads require `viewer`+; writes require `editor`+.
 *
 * - GET    /          - list groups in the organization.
 * - POST   /          - create a group.
 * - GET    /:group_id - fetch a single group.
 * - PATCH  /:group_id - partially update a group.
 * - DELETE /:group_id - delete a group.
 */
export const groupRoute = new Hono()
    .get('/', requireRole('viewer'), groupController.getAll)
    .post('/', requireRole('editor'), groupController.post)
    .get('/:group_id', requireRole('viewer'), groupController.get)
    .patch('/:group_id', requireRole('editor'), groupController.update)
    .delete('/:group_id', requireRole('editor'), groupController.delete)

/**
 * Routes for the `/organizations/:organization_id/campaigns/:campaign_id/groups`
 * resource: groups scoped to a single campaign. Reads require `viewer`+;
 * writes require `editor`+.
 *
 * - GET  / - list groups in the campaign.
 * - POST / - create a group in the campaign.
 */
export const campaignGroupRoute = new Hono()
    .get('/', requireRole('viewer'), groupController.getAllByCampaign)
    .post('/', requireRole('editor'), groupController.postByCampaign)
