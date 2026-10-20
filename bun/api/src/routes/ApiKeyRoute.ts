import { Hono } from "hono";
import { ApiKeyController } from "../controllers";
import { ApiKeyService } from "../services";
import { requireAbility } from "../middleware";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const apiKeyService = new ApiKeyService();
const apiKeyController = new ApiKeyController(apiKeyService);

/**
 * Routes for the `/keys` resource: API keys, the only principal. Each
 * endpoint requires the matching `Key` claim; `PATCH` and `DELETE`
 * additionally refuse to act on the caller's own key.
 *
 * - GET    /        - list keys (summary shape unless the caller can `create Key`).
 * - POST   /        - mint a key; the response carries its secret, once.
 * - GET    /:key_id - fetch a single key.
 * - PATCH  /:key_id - update a key's name, claims or expiry.
 * - DELETE /:key_id - revoke a key.
 */
export const apiKeyRoute = new Hono()
    .get('/', requireAbility('read', 'Key'), apiKeyController.getAll)
    .post('/', requireAbility('create', 'Key'), apiKeyController.post)
    .get('/:key_id', requireAbility('read', 'Key'), apiKeyController.get)
    .patch('/:key_id', requireAbility('update', 'Key'), apiKeyController.update)
    .delete('/:key_id', requireAbility('delete', 'Key'), apiKeyController.delete)

/**
 * Route for `/me`: the calling key itself. Needs no claim beyond being
 * authenticated, so any valid key can learn what it may do.
 *
 * - GET / - the calling key, with its claims.
 */
export const meRoute = new Hono()
    .get('/', apiKeyController.me)
