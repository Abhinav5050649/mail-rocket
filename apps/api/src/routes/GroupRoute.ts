import { Hono } from "hono";
import { GroupController } from "../controllers";
import { GroupService } from "../services";
import { requireAbility } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const groupService = new GroupService();
const groupController = new GroupController(groupService);

/**
 * Routes for the `/groups` resource.
 * Each endpoint requires the key to hold the matching
 * `Group` claim (`read` for GETs, `create`/`update`/`delete` for writes).
 *
 * - GET    /          - list all groups.
 * - POST   /          - create a group.
 * - GET    /:group_id - fetch a single group.
 * - PATCH  /:group_id - partially update a group.
 * - DELETE /:group_id - delete a group.
 */
export const groupRoute = new Hono()
    .get('/', requireAbility('read', 'Group'), groupController.getAll)
    .post('/', requireAbility('create', 'Group'), groupController.post)
    .get('/:group_id', requireAbility('read', 'Group'), groupController.get)
    .patch('/:group_id', requireAbility('update', 'Group'), groupController.update)
    .delete('/:group_id', requireAbility('delete', 'Group'), groupController.delete)

/**
 * Routes for the `/campaigns/:campaign_id/groups`
 * resource: the groups a campaign sends to, read-only. Requires the
 * `read Group` claim. Which groups they are is set on the campaign (`group_ids`).
 *
 * - GET / - list the campaign's groups.
 */
export const campaignGroupRoute = new Hono()
    .get('/', requireAbility('read', 'Group'), groupController.getAllByCampaign)
