import { Hono } from "hono";
import { TemplateController } from "../controllers";
import { TemplateService } from "../services";
import { requireRole } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const templateService = new TemplateService();
const templateController = new TemplateController(templateService);

/**
 * Routes for the `/organizations/:organization_id/templates` resource.
 * Reads require `viewer`+; writes require `editor`+.
 *
 * - GET    /              - list templates in the organization, across all campaigns.
 * - POST   /              - create a template.
 * - GET    /:template_id  - fetch a single template.
 * - PATCH  /:template_id  - partially update a template.
 * - DELETE /:template_id  - delete a template.
 */
export const templateRoute = new Hono()
    .get('/', requireRole('viewer'), templateController.getAll)
    .post('/', requireRole('editor'), templateController.post)
    .get('/:template_id', requireRole('viewer'), templateController.get)
    .patch('/:template_id', requireRole('editor'), templateController.update)
    .delete('/:template_id', requireRole('editor'), templateController.delete)

/**
 * Routes for the `/organizations/:organization_id/campaigns/:campaign_id/templates`
 * resource: templates scoped to a single campaign. Reads require `viewer`+;
 * writes require `editor`+.
 *
 * - GET  / - list templates in the campaign.
 * - POST / - create a template in the campaign.
 */
export const campaignTemplateRoute = new Hono()
    .get('/', requireRole('viewer'), templateController.getAllByCampaign)
    .post('/', requireRole('editor'), templateController.postByCampaign)
