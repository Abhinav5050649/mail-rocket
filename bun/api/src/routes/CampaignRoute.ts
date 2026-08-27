import { Hono } from "hono";
import { CampaignController } from "../controllers";
import { CampaignService } from "../services";
import { requireRole } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const campaignService = new CampaignService();
const campaignController = new CampaignController(campaignService);

/**
 * Routes for the `/organizations/:organization_id/campaigns` resource.
 * Reads require `viewer`+; writes require `editor`+.
 *
 * - GET    /             - list campaigns in the organization.
 * - POST   /             - create a campaign.
 * - GET    /:campaign_id - fetch a single campaign.
 * - PATCH  /:campaign_id - partially update a campaign.
 * - DELETE /:campaign_id - delete a campaign.
 */
export const campaignRoute = new Hono()
    .get('/', requireRole('viewer'), campaignController.getAll)
    .post('/', requireRole('editor'), campaignController.post)
    .get('/:campaign_id', requireRole('viewer'), campaignController.get)
    .patch('/:campaign_id', requireRole('editor'), campaignController.update)
    .delete('/:campaign_id', requireRole('editor'), campaignController.delete)
