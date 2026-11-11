import { Hono } from "hono";
import { SubscriberController } from "../controllers";
import { SubscriberService } from "../services";
import { requireAbility } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const subscriberService = new SubscriberService();
const subscriberController = new SubscriberController(subscriberService);

/**
 * Routes for the `/subscribers` resource.
 * Each endpoint requires the key to hold the matching
 * `Subscriber` claim (`read` for GETs, `create`/`update`/`delete` for writes).
 *
 * - GET    /              - list all subscribers.
 * - POST   /              - create a subscriber.
 * - POST   /import        - create many subscribers (reusing existing emails) and add them to groups.
 * - POST   /bulk-delete   - delete many subscribers (`{ subscriber_ids }`), keeping any with send history.
 * - GET    /:subscriber_id - fetch a single subscriber.
 * - PATCH  /:subscriber_id - partially update a subscriber.
 * - DELETE /:subscriber_id - delete a subscriber.
 */
export const subscriberRoute = new Hono()
    .get('/', requireAbility('read', 'Subscriber'), subscriberController.getAll)
    .post('/', requireAbility('create', 'Subscriber'), subscriberController.post)
    // Same claim as creating one subscriber, which may also set its groups.
    .post('/import', requireAbility('create', 'Subscriber'), subscriberController.importMany)
    .post('/bulk-delete', requireAbility('delete', 'Subscriber'), subscriberController.deleteMany)
    .get('/:subscriber_id', requireAbility('read', 'Subscriber'), subscriberController.get)
    .patch('/:subscriber_id', requireAbility('update', 'Subscriber'), subscriberController.update)
    .delete('/:subscriber_id', requireAbility('delete', 'Subscriber'), subscriberController.delete)

/**
 * Routes for the `/campaigns/:campaign_id/subscribers`
 * resource: a campaign's audience, read-only. Requires the `read Subscriber`
 * claim. Who is in it is set on the campaign (`group_ids`, `subscriber_ids`).
 *
 * - GET / - list everyone the campaign sends to.
 */
export const campaignSubscriberRoute = new Hono()
    .get('/', requireAbility('read', 'Subscriber'), subscriberController.getAllByCampaign)

/**
 * Routes for `/groups/:group_id/subscribers`: a group's members. Membership
 * is many-to-many, so these add or remove an existing subscriber rather than
 * creating or deleting one. Listing needs `read Subscriber`; changing who is
 * in a group is an edit of the group, so it needs `update Group`.
 *
 * - GET    /              - list the group's members.
 * - POST   /              - add an existing subscriber (`{ subscriber_id }`).
 * - POST   /bulk-remove   - remove many subscribers from the group (`{ subscriber_ids }`).
 * - DELETE /:subscriber_id - remove a subscriber from the group.
 */
export const groupMembershipRoute = new Hono()
    .get('/', requireAbility('read', 'Subscriber'), subscriberController.getAllByGroup)
    .post('/', requireAbility('update', 'Group'), subscriberController.addToGroup)
    .post('/bulk-remove', requireAbility('update', 'Group'), subscriberController.removeManyFromGroup)
    .delete('/:subscriber_id', requireAbility('update', 'Group'), subscriberController.removeFromGroup)
