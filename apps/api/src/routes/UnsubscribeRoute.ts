import { Hono } from "hono";
import { UnsubscribeController } from "../controllers";
import { OrganizationService, SubscriberService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service set is safe to reuse across requests.
const unsubscribeController = new UnsubscribeController(new SubscriberService(), new OrganizationService());

/**
 * Routes for `/unsubscribe`: the link in every sent email's footer and its
 * `List-Unsubscribe` header. Public - no API key or claim - since
 * subscribers open it from their mail. `jsonOnly` lets its POST through
 * with a form body.
 *
 * - GET  /:delivery_id - confirmation page with an "Unsubscribe" button.
 * - POST /:delivery_id - unsubscribe (that button, or one-click from a mail client).
 */
export const unsubscribeRoute = new Hono()
    .get('/:delivery_id', unsubscribeController.confirm)
    .post('/:delivery_id', unsubscribeController.unsubscribe)
