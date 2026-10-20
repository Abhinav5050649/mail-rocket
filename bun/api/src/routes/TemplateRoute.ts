import { Hono } from "hono";
import { TemplateController } from "../controllers";
import { TemplateService } from "../services";
import { requireAbility } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const templateService = new TemplateService();
const templateController = new TemplateController(templateService);

/**
 * Routes for the `/templates` resource.
 * Each endpoint requires the key to hold the matching
 * `Template` claim (`read` for GETs, `create`/`update`/`delete` for writes).
 *
 * - GET    /              - list templates across all campaigns.
 * - POST   /              - create a template.
 * - GET    /:template_id  - fetch a single template.
 * - PATCH  /:template_id  - partially update a template.
 * - DELETE /:template_id  - delete a template.
 */
export const templateRoute = new Hono()
    .get('/', requireAbility('read', 'Template'), templateController.getAll)
    .post('/', requireAbility('create', 'Template'), templateController.post)
    .get('/:template_id', requireAbility('read', 'Template'), templateController.get)
    .patch('/:template_id', requireAbility('update', 'Template'), templateController.update)
    .delete('/:template_id', requireAbility('delete', 'Template'), templateController.delete)

/**
 * Routes for the `/campaigns/:campaign_id/templates`
 * resource: templates scoped to a single campaign. Requires the matching
 * `Template` claim.
 *
 * - GET  / - list templates in the campaign.
 * - POST / - create a template in the campaign.
 */
export const campaignTemplateRoute = new Hono()
    .get('/', requireAbility('read', 'Template'), templateController.getAllByCampaign)
    .post('/', requireAbility('create', 'Template'), templateController.postByCampaign)
