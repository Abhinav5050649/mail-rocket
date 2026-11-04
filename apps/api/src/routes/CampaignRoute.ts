import { Hono } from "hono";
import { CampaignController } from "../controllers";
import { CampaignService } from "../services";
import { requireAbility } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const campaignService = new CampaignService();
const campaignController = new CampaignController(campaignService);

/**
 * Routes for the `/campaigns` resource.
 * Each endpoint requires the key to hold the matching
 * `Campaign` claim (`read` for GETs, `create`/`update`/`delete` for writes).
 *
 * - GET    /             - list all campaigns.
 * - POST   /             - create a campaign.
 * - GET    /:campaign_id - fetch a single campaign.
 * - PATCH  /:campaign_id - partially update a campaign.
 * - DELETE /:campaign_id - delete a campaign.
 */
export const campaignRoute = new Hono()
    .get('/', requireAbility('read', 'Campaign'), campaignController.getAll)
    .post('/', requireAbility('create', 'Campaign'), campaignController.post)
    .get('/:campaign_id', requireAbility('read', 'Campaign'), campaignController.get)
    .patch('/:campaign_id', requireAbility('update', 'Campaign'), campaignController.update)
    .delete('/:campaign_id', requireAbility('delete', 'Campaign'), campaignController.delete)
